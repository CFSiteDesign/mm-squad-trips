// Admin overview of all squad leaders and their bookings. Gated by ADMIN_PASSWORD.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";
import { APP_URL, sendEmail, squadCreatedEmail } from "../_shared/email.ts";
// Tiers per the Aug 2026 squad copy (RALLY 3 MATES / RALLY 6 MATES), changed
// 3 Sep 2026 from 4 / 8. Counted in mates, not checkouts (14 Oct 2026).
import {
  matesByLeader,
  type RewardRow,
  settleAllSquadRewards,
  settleSquadRewards,
  type SquadLeader,
  STUDENT_GOAL as STUDENT_TIER_FREE,
  TIER_FREE,
  TIER_HALF,
} from "../_shared/squad-reward.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tierLabel(count: number, isStudent: boolean) {
  if (isStudent) return count >= STUDENT_TIER_FREE ? "2 FREE SPOTS" : "—";
  if (count >= TIER_FREE) return "FREE TRIP";
  if (count >= TIER_HALF) return "50% OFF";
  return "—";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!url || !key || !adminPassword) return jr({ error: "Backend not configured" }, 503);

  const bearer = adminAuthHeaderToken(req);
  let authed = bearer ? await verifyAdminToken(bearer) : false;

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  if (!authed) {
    const password = typeof body.password === "string" ? body.password.trim() : "";
    if (!password || password !== adminPassword) {
      return jr({ error: "Unauthorized" }, 401);
    }
  }

  const supabase = createClient(url, key);

  // Action: approve/reject a student application
  if (body.action === "approve" || body.action === "reject") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return jr({ error: "Missing id" }, 400);
    const newStatus = body.action === "approve" ? "approved" : "rejected";
    const { data: updated, error: uErr } = await supabase
      .from("squad_leaders")
      .update({ status: newStatus })
      .eq("id", id)
      .select("name, email, code, access_token, status")
      .single();
    if (uErr || !updated) return jr({ error: uErr?.message ?? "Update failed" }, 500);

    if (newStatus === "approved") {
      const { subject, html } = squadCreatedEmail({
        leaderName: (updated.name ?? "").split(" ")[0] || updated.name || "there",
        squadName: `${updated.name ?? "your"}'s squad`,
        squadCode: updated.code,
        dashboardUrl: `${APP_URL}/students/squad-leader/dashboard?token=${encodeURIComponent(updated.access_token)}`,
      });
      sendEmail({ to: updated.email, subject, html, templateName: "squad_approved" }).catch((e) => console.warn("approve email failed", e));
    }
    return jr({ ok: true, status: newStatus });
  }

  // Squad rewards (_shared/squad-reward.ts). Approve sends the refund waiting
  // on a leader, Decline closes it without paying, Link points a leader at a
  // booking made under another email, Check runs every leader again.
  if (body.action === "approve_reward" || body.action === "decline_reward" || body.action === "link_booking") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return jr({ error: "Missing id" }, 400);
    try {
      if (body.action === "decline_reward") {
        const { error: dErr } = await supabase
          .from("squad_rewards")
          .update({ status: "declined", updated_at: new Date().toISOString() })
          .eq("squad_leader_id", id)
          .in("status", ["awaiting_approval", "failed"]);
        if (dErr) return jr({ error: dErr.message }, 500);
        return jr({ ok: true, actions: ["declined"] });
      }
      if (body.action === "link_booking") {
        const ref = typeof body.bookingRef === "string" ? body.bookingRef.trim().toUpperCase() : "";
        if (ref) {
          const { data: found } = await supabase.from("bookings").select("id").eq("booking_ref", ref).limit(1);
          if (!found?.length) return jr({ error: `No booking ${ref}` }, 404);
        }
        const { error: kErr } = await supabase.from("squad_leaders").update({ reward_booking_ref: ref || null }).eq("id", id);
        if (kErr) return jr({ error: kErr.message }, 500);
        const r = await settleSquadRewards(supabase, id);
        return jr({ ok: true, actions: r.actions });
      }
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return jr({ error: "Stripe not configured" }, 503);
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const r = await settleSquadRewards(supabase, id, { stripe, approve: true });
      return jr({ ok: true, actions: r.actions });
    } catch (e) {
      return jr({ error: e instanceof Error ? e.message : "Reward action failed" }, 500);
    }
  }
  if (body.action === "check_rewards") {
    try {
      const results = await settleAllSquadRewards(supabase);
      return jr({ ok: true, actions: results.flatMap((r) => r.actions) });
    } catch (e) {
      return jr({ error: e instanceof Error ? e.message : "Reward check failed" }, 500);
    }
  }

  const { data: leaders, error: lErr } = await supabase
    .from("squad_leaders")
    .select("id, name, email, phone, instagram, code, preferred_trip_slug, preferred_month, reason, created_at, access_token, is_student, status, university, society, reward_booking_ref")
    .order("created_at", { ascending: false });
  if (lErr) return jr({ error: lErr.message }, 500);

  const { data: bookings, error: bErr } = await supabase
    .from("squad_bookings")
    .select("id, squad_leader_id, booker_name, booker_email, trip_slug, departure_date, created_at")
    .order("created_at", { ascending: false });
  if (bErr) return jr({ error: bErr.message }, 500);

  let mates: Awaited<ReturnType<typeof matesByLeader>>;
  try {
    mates = await matesByLeader(supabase, (leaders ?? []) as SquadLeader[]);
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "Could not count squads" }, 500);
  }
  const { data: rewardRows, error: rErr } = await supabase.from("squad_rewards").select("*");
  if (rErr) return jr({ error: rErr.message }, 500);
  const rewardsByLeader = new Map<string, RewardRow[]>();
  for (const r of (rewardRows ?? []) as RewardRow[]) {
    rewardsByLeader.set(r.squad_leader_id, [...(rewardsByLeader.get(r.squad_leader_id) ?? []), r]);
  }

  const byLeader = new Map<string, typeof bookings>();
  for (const b of bookings ?? []) {
    const arr = byLeader.get(b.squad_leader_id) ?? [];
    arr.push(b);
    byLeader.set(b.squad_leader_id, arr);
  }

  const rows = (leaders ?? []).map((l) => {
    const bs = byLeader.get(l.id) ?? [];
    const count = mates.get(l.id)?.length ?? 0;
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      instagram: l.instagram,
      code: l.code,
      preferredTripSlug: l.preferred_trip_slug,
      preferredMonth: l.preferred_month,
      reason: l.reason,
      createdAt: l.created_at,
      accessToken: l.access_token,
      isStudent: !!l.is_student,
      status: l.status ?? "approved",
      university: l.university,
      society: l.society,
      count,
      tier: tierLabel(count, !!l.is_student),
      bookings: bs,
      rewardBookingRef: l.reward_booking_ref ?? null,
      rewards: (rewardsByLeader.get(l.id) ?? []).sort((a, b) => a.tier.localeCompare(b.tier) * -1),
    };
  });

  const totalBookings = bookings?.length ?? 0;
  const totalLeaders = leaders?.length ?? 0;
  const unlockedHalf = rows.filter((r) => !r.isStudent && r.count >= TIER_HALF && r.count < TIER_FREE).length;
  const unlockedFree = rows.filter((r) => !r.isStudent && r.count >= TIER_FREE).length;
  const pendingStudents = rows.filter((r) => r.isStudent && r.status === "pending").length;

  return jr({
    leaders: rows,
    stats: { totalLeaders, totalBookings, unlockedHalf, unlockedFree, pendingStudents },
  });
});
