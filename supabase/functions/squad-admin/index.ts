// Admin overview of all squad leaders and their bookings. Gated by ADMIN_PASSWORD.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";

const TIER_HALF = 4;
const TIER_FREE = 8;

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tierLabel(count: number) {
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

  // Accept either a valid admin token (Bearer) or the admin password in body.
  const bearer = adminAuthHeaderToken(req);
  let authed = bearer ? await verifyAdminToken(bearer) : false;

  if (!authed) {
    let body: Record<string, string> = {};
    try {
      body = await req.json();
    } catch {
      return jr({ error: "Unauthorized" }, 401);
    }
    const password = (body.password ?? "").trim();
    if (!password || password !== adminPassword) {
      return jr({ error: "Invalid password" }, 401);
    }
  }

  const supabase = createClient(url, key);

  const { data: leaders, error: lErr } = await supabase
    .from("squad_leaders")
    .select("id, name, email, phone, instagram, code, preferred_trip_slug, preferred_month, reason, created_at, access_token")
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
      count: bs.length,
      tier: tierLabel(bs.length),
      bookings: bs,
    };
  });

  const totalBookings = bookings?.length ?? 0;
  const totalLeaders = leaders?.length ?? 0;
  const unlockedHalf = rows.filter((r) => r.count >= TIER_HALF && r.count < TIER_FREE).length;
  const unlockedFree = rows.filter((r) => r.count >= TIER_FREE).length;

  return jr({
    leaders: rows,
    stats: { totalLeaders, totalBookings, unlockedHalf, unlockedFree },
  });
});
