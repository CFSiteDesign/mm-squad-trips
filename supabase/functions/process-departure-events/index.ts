// Cron-driven worker. Drains the departure_events queue.
//
// 'confirmed' events fire when a departure reaches 5 Confirmed travellers
// (recompute_departure_status). Since 8 Oct 2026 there is no minimum (Charlie:
// every departure runs, every booking is confirmed at booking), and the comms
// doc of 16 Oct 2026 removed the "5 travellers booked" ops note too, so nothing
// is sent to anyone: events are just marked processed_at = now() so the queue
// stays empty.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) {
    return new Response("not configured", { status: 503, headers: corsHeaders });
  }
  const sb = createClient(sbUrl, sbKey);

  // Cron secret guard (same model as charge-trip-balances)
  const providedCronSecret = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultCronSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) {
    return new Response("cron secret unavailable", { status: 503, headers: corsHeaders });
  }
  const cronSecret = normalizeCronSecret(
    typeof vaultCronSecret === "string" ? vaultCronSecret : null,
  );
  if (!cronSecret || providedCronSecret !== cronSecret) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // Pull unprocessed events
  const { data: events, error } = await sb
    .from("departure_events")
    .select("id,departure_id,event_type,payload,created_at")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const ev of events ?? []) {
    await sb
      .from("departure_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", ev.id);
    results.push({ event: ev.id, departure: ev.departure_id, type: ev.event_type });
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
