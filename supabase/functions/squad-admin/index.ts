// Admin overview of all squad leaders and their bookings. Gated by ADMIN_PASSWORD.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";
import { APP_URL, sendEmail, squadCreatedEmail } from "../_shared/email.ts";

const TIER_HALF = 4;
const TIER_FREE = 8;
const STUDENT_TIER_FREE = 10;

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

  const { data: leaders, error: lErr } = await supabase
    .from("squad_leaders")
    .select("id, name, email, phone, instagram, code, preferred_trip_slug, preferred_month, reason, created_at, access_token, is_student, status, university, society")
    .order("created_at", { ascending: false });
  if (lErr) return jr({ error: lErr.message }, 500);

  const { data: bookings, error: bErr } = await supabase
    .from("squad_bookings")
    .select("id, squad_leader_id, booker_name, booker_email, trip_slug, departure_date, created_at")
    .order("created_at", { ascending: false });
  if (bErr) return jr({ error: bErr.message }, 500);

  const byLeader = new Map<string, typeof bookings>();
  for (const b of bookings ?? []) {
    const arr = byLeader.get(b.squad_leader_id) ?? [];
    arr.push(b);
    byLeader.set(b.squad_leader_id, arr);
  }

  const rows = (leaders ?? []).map((l) => {
    const bs = byLeader.get(l.id) ?? [];
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
      count: bs.length,
      tier: tierLabel(bs.length, !!l.is_student),
      bookings: bs,
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
