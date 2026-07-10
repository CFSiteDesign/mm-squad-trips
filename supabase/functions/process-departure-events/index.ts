// Cron-driven worker. Drains the departure_events queue:
//  - On 'confirmed' events, emails every lead booker on that departure the
//    "trip confirmed" message with a balance payment link.
//  - Marks events processed_at = now() and writes per-booking
//    trip_confirmed_notified_at so re-runs don't double-send.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  APP_URL,
  OPS_NOTIFY_EMAILS,
  opsCcForTrip,
  sendEmail,
  tripConfirmedEmail,
} from "../_shared/email.ts";
import { tripCountryFromSlug } from "../_shared/trip-details.ts";

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
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)} USD`;
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
    const country = tripCountryFromSlug(tripSlug);

    // Balance due date = 7 days before departure
    let balanceDueDate = "";
    try {
      const d = new Date(`${depDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 7);
      balanceDueDate = fmtDate(d.toISOString());
    } catch {
      balanceDueDate = "";
    }

    // Lead bookings on this departure not yet notified
    const { data: leads } = await sb
      .from("bookings")
      .select(
        "id,stripe_session_id,lead_email,lead_name,group_size,balance_amount,booking_ref,trip_confirmed_notified_at",
      )
      .eq("departure_id", ev.departure_id)
      .eq("spot_number", 1)
      .eq("status", "Confirmed")
      .is("trip_confirmed_notified_at", null);

    let sent = 0;
    for (const lead of leads ?? []) {
      const balanceTotal =
        Number(lead.balance_amount ?? 0) * Number(lead.group_size ?? 1);
      const bookingRef =
        (lead.booking_ref as string) || (lead.stripe_session_id as string);
      const payBalanceUrl = `${APP_URL}/pay-balance?ref=${encodeURIComponent(
        bookingRef,
      )}&email=${encodeURIComponent((lead.lead_email as string) ?? "")}`;
      const bookingUrl = `${APP_URL}/booking-success?session_id=${encodeURIComponent(
        lead.stripe_session_id as string,
      )}`;

      if (!lead.lead_email) continue;

      const { subject, html } = tripConfirmedEmail({
        firstName:
          ((lead.lead_name as string | null) ?? "").split(" ")[0] || "traveler",
        tripCountry: country,
        tripName,
        departureDate: fmtDate(depDate),
        spots: lead.group_size as number,
        balanceAmount: fmtUsd(balanceTotal),
        balanceDueDate,
        payBalanceUrl,
        bookingRef,
        bookingUrl,
      });

      await sendEmail({
        to: lead.lead_email as string,
        subject,
        html,
      }).catch((e) => console.warn("trip-confirmed email failed", e));

      await sb
        .from("bookings")
        .update({ trip_confirmed_notified_at: new Date().toISOString() })
        .eq("stripe_session_id", lead.stripe_session_id);

      sent++;
    }

    // Ops notification — one line so the team sees the confirmation happen
    try {
      const opsCc = opsCcForTrip(tripName, tripSlug);
      await sendEmail({
        to: OPS_NOTIFY_EMAILS,
        cc: opsCc.length ? opsCc : undefined,
        subject: `Trip CONFIRMED — ${tripName} · ${fmtDate(depDate)}`,
        html: `<p>${tripName} on <strong>${fmtDate(
          depDate,
        )}</strong> just hit its 5-traveller minimum and is officially confirmed.</p>
<p>${sent} lead booker${sent === 1 ? "" : "s"} have been emailed with flight clearance + balance link.</p>`,
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
