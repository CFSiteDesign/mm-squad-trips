// Cron-driven 7-day-out reminder. Runs daily.
// For every Confirmed booking on a Confirmed departure exactly 7 days away
// (and not yet reminded), sends either:
//  - balanceReminderEmail (if balance outstanding) with payment link, or
//  - tripCountdownEmail (if balance already paid)
// Both emails include trip-specific final details + a property WhatsApp link.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  APP_URL,
  balanceReminderEmail,
  sendEmail,
  tripCountdownEmail,
} from "../_shared/email.ts";
import { tripCountryFromSlug, tripFinalDetails } from "../_shared/trip-details.ts";

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

function ymdPlusDays(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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

  const targetDate = ymdPlusDays(7); // departure_date == today + 7

  const { data: rows, error } = await sb
    .from("bookings")
    .select(
      "id,stripe_session_id,lead_email,lead_name,group_size,balance_amount,balance_status,booking_ref,trip_slug,trip_name,reminder_7d_sent_at,departure_id,departures!inner(departure_date,status)",
    )
    .eq("spot_number", 1)
    .eq("status", "Confirmed")
    .is("reminder_7d_sent_at", null)
    .eq("departures.departure_date", targetDate)
    .eq("departures.status", "confirmed");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const row of rows ?? []) {
    if (!row.lead_email) continue;
    const depDate =
      (row.departures as { departure_date?: string } | null)?.departure_date ?? "";
    const tripSlug = (row.trip_slug as string) || "";
    const tripName = (row.trip_name as string) || tripSlug || "your trip";
    const country = tripCountryFromSlug(tripSlug);
    const details = tripFinalDetails(tripSlug);
    const bookingRef =
      (row.booking_ref as string) || (row.stripe_session_id as string);
    const firstName =
      ((row.lead_name as string | null) ?? "").split(" ")[0] || "traveler";

    const balancePaid = row.balance_status === "charged";

    if (balancePaid) {
      const { subject, html } = tripCountdownEmail({
        firstName,
        tripCountry: country,
        tripName,
        departureDate: fmtDate(depDate),
        bookingRef,
        finalDetailsHtml: details.finalDetailsHtml,
        whatsappUrl: details.whatsappUrl,
      });
      await sendEmail({ to: row.lead_email as string, subject, html, templateName: "balance_reminder_7d" }).catch((e) =>
        console.warn("countdown email failed", e),
      );
    } else {
      const balanceTotal =
        Number(row.balance_amount ?? 0) * Number(row.group_size ?? 1);
      const payBalanceUrl = `${APP_URL}/pay-balance?ref=${encodeURIComponent(
        bookingRef,
      )}&email=${encodeURIComponent(row.lead_email as string)}`;
      const { subject, html } = balanceReminderEmail({
        firstName,
        tripCountry: country,
        tripName,
        departureDate: fmtDate(depDate),
        balanceAmount: fmtUsd(balanceTotal),
        payBalanceUrl,
        bookingRef,
        finalDetailsHtml: details.finalDetailsHtml,
        whatsappUrl: details.whatsappUrl,
      });
      await sendEmail({ to: row.lead_email as string, subject, html, templateName: "trip_countdown_7d" }).catch((e) =>
        console.warn("balance-reminder email failed", e),
      );
    }

    await sb
      .from("bookings")
      .update({ reminder_7d_sent_at: new Date().toISOString() })
      .eq("stripe_session_id", row.stripe_session_id);

    results.push({
      session: row.stripe_session_id,
      kind: balancePaid ? "countdown" : "reminder",
    });
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
