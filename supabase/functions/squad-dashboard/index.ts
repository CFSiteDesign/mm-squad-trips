// Return the squad leader's dashboard data, authenticated by access_token.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// Tiers per the Aug 2026 squad copy (RALLY 3 MATES / RALLY 6 MATES), changed
// 3 Sep 2026 from 4 / 8. Counted in mates, not checkouts (14 Oct 2026).
import { matesByLeader, type SquadLeader, STUDENT_GOAL, TIER_FREE, TIER_HALF } from "../_shared/squad-reward.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function computeTier(count: number, isStudent: boolean) {
  if (isStudent) {
    if (count >= STUDENT_GOAL) {
      return { discountPct: 0, nextLine: "2 FREE SPOTS unlocked 🔥 Email Hayley to book them in.", progress: 100 };
    }
    const more = STUDENT_GOAL - count;
    return {
      discountPct: 0,
      nextLine: `${more} more mate${more === 1 ? "" : "s"} to unlock 2 FREE squad leader spots`,
      progress: (count / STUDENT_GOAL) * 100,
    };
  }
  if (count >= TIER_FREE) {
    return { discountPct: 100, nextLine: "Trip unlocked. You're going for FREE 🔥", progress: 100 };
  }
  if (count >= TIER_HALF) {
    const more = TIER_FREE - count;
    return {
      discountPct: 50,
      nextLine: `50% off locked in. ${more} more mate${more === 1 ? "" : "s"} and your trip is FREE`,
      progress: 50 + ((count - TIER_HALF) / (TIER_FREE - TIER_HALF)) * 50,
    };
  }
  const more = TIER_HALF - count;
  return {
    discountPct: 0,
    nextLine: `${more} more mate${more === 1 ? "" : "s"} to unlock 50% off`,
    progress: (count / TIER_HALF) * 50,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return jr({ error: "Invalid JSON" }, 400);
  }
  const token = (body.accessToken ?? "").trim();
  if (!token) return jr({ error: "Missing access token" }, 400);

  const supabase = createClient(url, key);

  const { data: leader, error: lErr } = await supabase
    .from("squad_leaders")
    .select("id, name, email, code, preferred_trip_slug, preferred_month, created_at, is_student, reward_booking_ref")
    .eq("access_token", token)
    .maybeSingle();
  if (lErr) return jr({ error: lErr.message }, 500);
  if (!leader) return jr({ error: "Invalid or expired link" }, 404);

  // One entry per mate (traveller), newest first. Names only: no emails or
  // session ids go to the leader.
  let bookings: Array<{ id: string; booker_name: string; trip_slug: string | null; departure_date: string | null; created_at: string }>;
  try {
    const mates = (await matesByLeader(supabase, [leader as SquadLeader])).get(leader.id) ?? [];
    bookings = mates
      .map((x, i) => ({ id: `${i}`, booker_name: x.name, trip_slug: x.trip_slug, departure_date: x.departure_date, created_at: x.booked_at }))
      .reverse();
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "Could not load squad" }, 500);
  }

  // Rewards applied to the leader's own booking (_shared/squad-reward.ts).
  const { data: rewardRows } = await supabase
    .from("squad_rewards")
    .select("tier, status, amount, balance_cut, refund_due, refunded, booking_ref")
    .eq("squad_leader_id", leader.id);
  const rewards = (rewardRows ?? []).filter((r) => r.status !== "processing");

  const count = bookings.length;
  const isStudent = !!leader.is_student;
  return jr({
    leader: {
      name: leader.name,
      email: leader.email,
      code: leader.code,
      preferredTripSlug: leader.preferred_trip_slug,
      preferredMonth: leader.preferred_month,
      isStudent,
    },
    bookings,
    count,
    tier: computeTier(count, isStudent),
    rewards,
  });
});
