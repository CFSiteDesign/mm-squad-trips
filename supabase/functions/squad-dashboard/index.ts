// Return the squad leader's dashboard data, authenticated by access_token.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TIER_HALF = 4;
const TIER_FREE = 8;
const STUDENT_GOAL = 10;

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
      nextLine: `${more} more booking${more === 1 ? "" : "s"} to unlock 2 FREE squad leader spots`,
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
      nextLine: `50% off locked in — ${more} more booking${more === 1 ? "" : "s"} and your trip is FREE`,
      progress: 50 + ((count - TIER_HALF) / (TIER_FREE - TIER_HALF)) * 50,
    };
  }
  const more = TIER_HALF - count;
  return {
    discountPct: 0,
    nextLine: `${more} more booking${more === 1 ? "" : "s"} to unlock 50% off`,
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
    .select("id, name, email, code, preferred_trip_slug, preferred_month, created_at, is_student")
    .eq("access_token", token)
    .maybeSingle();
  if (lErr) return jr({ error: lErr.message }, 500);
  if (!leader) return jr({ error: "Invalid or expired link" }, 404);

  const { data: bookings, error: bErr } = await supabase
    .from("squad_bookings")
    .select("id, booker_name, booker_email, trip_slug, departure_date, created_at")
    .eq("squad_leader_id", leader.id)
    .order("created_at", { ascending: false });
  if (bErr) return jr({ error: bErr.message }, 500);

  const count = bookings?.length ?? 0;
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
    bookings: bookings ?? [],
    count,
    tier: computeTier(count, isStudent),
  });
});
