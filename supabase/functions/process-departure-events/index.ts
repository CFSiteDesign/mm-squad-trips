// Cron-driven worker. Drains the departure_events queue.
//
// 'confirmed' events fire when a departure reaches 5 Confirmed travellers
// (recompute_departure_status). Since 8 Oct 2026 there is no minimum (Charlie:
// every departure runs, every booking is confirmed at booking), so reaching 5
// is just a milestone: ops get a one-line note, guests get nothing (they were
// told "confirmed, book your flights" when they booked) and nothing goes to
// Klaviyo (a "Departure Confirmed" flow would imply there was a minimum).
// Events are marked processed_at = now() either way.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { OPS_NOTIFY_EMAILS, opsCcForTrip, sendEmail } from "../_shared/email.ts";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return d;
  }
}
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
    if (ev.event_type !== "confirmed") {
      // Unknown event — mark processed so it doesn't loop forever
      await sb
        .from("departure_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", ev.id);
      continue;
    }

    // Departure + trip context
    const { data: dep } = await sb
      .from("departures")
      .select("id,departure_date,trip_id,trips(slug,name)")
      .eq("id", ev.departure_id)
      .maybeSingle();

    const depDate = dep?.departure_date ?? "";
    const tripSlug =
      (dep?.trips as { slug?: string } | null)?.slug ?? "";
    const tripName =
      (dep?.trips as { name?: string } | null)?.name ?? "your trip";

    // Ops note: a milestone, not a go/no-go. Every departure runs regardless.
    const sent = 0;
    try {
      const opsCc = opsCcForTrip(tripName, tripSlug);
      await sendEmail({
        to: OPS_NOTIFY_EMAILS,
        cc: opsCc.length ? opsCc : undefined,
        subject: `5 travellers booked: ${tripName} · ${fmtDate(depDate)}`,
        html: `<p>${tripName} on <strong>${fmtDate(depDate)}</strong> now has 5 or more travellers booked.</p>
<p>No action needed: every departure runs, and guests were already told they're confirmed when they booked.</p>`,
        templateName: "trip_confirmed_ops",
      });
    } catch (e) {
      console.warn("ops confirmation email failed", e);
    }

    await sb
      .from("departure_events")
      .update({
        processed_at: new Date().toISOString(),
        payload: { ...(ev.payload as Record<string, unknown>), sent },
      })
      .eq("id", ev.id);

    results.push({ event: ev.id, departure: ev.departure_id, sent });
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
