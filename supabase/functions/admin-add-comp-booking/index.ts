// Admin: add a complimentary (free) booking. Token-gated.
// Inserts a Confirmed booking with final_price=0 and a synthetic stripe_session_id.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = adminAuthHeaderToken(req);
    if (!(await verifyAdminToken(token))) return jr({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const trip_id = String(body.trip_id ?? "").trim();
    const departure_id = String(body.departure_id ?? "").trim();
    const lead_name = String(body.lead_name ?? "").trim();
    const lead_email = String(body.lead_email ?? "").trim();
    const lead_phone = body.lead_phone ? String(body.lead_phone).trim() : null;
    const lead_country = body.lead_country ? String(body.lead_country).trim() : null;
    const lead_age = body.lead_age != null && body.lead_age !== "" ? Number(body.lead_age) : null;
    const notes = body.notes ? String(body.notes).trim() : "";

    if (!trip_id) return jr({ error: "trip_id required" }, 400);
    if (!departure_id) return jr({ error: "departure_id required" }, 400);
    if (!lead_name) return jr({ error: "lead_name required" }, 400);
    if (!lead_email) return jr({ error: "lead_email required" }, 400);

    // Generate a short readable booking ref and unique synthetic session id
    const ref = `COMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sessionId = `comp_${crypto.randomUUID()}`;

    const insertRow = {
      trip_id,
      departure_id,
      booking_type: "Lead",
      group_size: 1,
      spot_number: 1,
      lead_name,
      lead_email,
      lead_phone,
      lead_country,
      lead_age,
      lead_solo: true,
      lead_source: notes ? `Comp: ${notes}` : "Comp (admin)",
      payment_type: "Comp",
      original_price: 0,
      discount_amount: 0,
      final_price: 0,
      amount_paid: 0,
      balance_amount: 0,
      status: "Confirmed",
      stripe_session_id: sessionId,
      booking_ref: ref,
    };

    const { data, error } = await sb.from("bookings").insert(insertRow).select().single();
    if (error) return jr({ error: error.message }, 400);

    return jr({ row: data });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
