// Cron-driven final-details reminder before departure. Runs daily (14:00 UTC).
// For every Confirmed booking on a confirmed departure 6 to 4 days away (and
// not yet reminded), sends either:
//  - balanceReminderEmail (if balance outstanding) with payment link, or
//  - tripCountdownEmail (if balance already paid)
// Both emails include trip-specific final details + a property WhatsApp link.
//
// Fixed 6 Oct 2026: it selected bookings.trip_slug / trip_name, which don't
// exist, so every run errored and no guest ever got this email. Trip comes from
// the departure now. The window starts at 6 days, not 7, because the balance
// is charged at 7 days by charge-trip-balances at the same 14:00 UTC: a day
// later the guest gets the right email (paid, or the pay link if the charge
// failed). A range rather than one exact day, so a missed run still sends.
// POST {"dry_run": true} lists what would go out.
//
// It also sends the heads-up 3 days before a balance is charged (5 Nov 2026), which
// the Black Friday T&Cs promise. That's on its own query, so a problem there can't
// stop the final-details emails.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  APP_URL,
  balanceHeadsUpEmail,
  balanceReminderEmail,
  sendEmail,
  tripCountdownEmail,
} from "../_shared/email.ts";
import { HEADS_UP_DAYS, headsUpDue } from "../_shared/balance-heads-up.ts";
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

async function sendHeadsUps(sb: SupabaseClient, dry: boolean) {
  const out: Array<Record<string, unknown>> = [];
  const now = Date.now();
  const { data, error } = await sb
    .from("bookings")
    .select("id,stripe_session_id,lead_email,lead_name,group_size,amount_paid,balance_amount,balance_next_attempt_at,booking_ref,created_at,departures!inner(departure_date,trips(slug,days))")
    .eq("spot_number", 1)
    .eq("status", "Confirmed")
    .eq("balance_status", "scheduled")
    .is("balance_heads_up_sent_at", null)
    .lte("balance_next_attempt_at", new Date(now + HEADS_UP_DAYS * 86_400_000).toISOString());
  if (error) {
    console.error("heads-up query failed:", error.message);
    return [{ error: error.message }];
  }
  for (const row of data ?? []) {
    if (!row.lead_email || !headsUpDue(row, now)) continue;
    const dep = row.departures as unknown as { departure_date?: string; trips?: { slug?: string; days?: number } | null } | null;
    const country = (dep?.trips?.slug ?? "").split("-")[0].replace(/^./, (c) => c.toUpperCase());
    const tripName = dep?.trips?.days && country ? `${dep.trips.days}-day ${country}` : country || "your trip";
    const amount = fmtUsd(Number(row.balance_amount) * Number(row.group_size));
    if (dry) {
      out.push({ to: row.lead_email, trip: tripName, amount, result: "would send" });
      continue;
    }
    try {
      const bookingRef = (row.booking_ref as string) || (row.stripe_session_id as string);
      const { subject, html } = balanceHeadsUpEmail({
        firstName: ((row.lead_name as string | null) ?? "").split(" ")[0] || "traveler",
        tripName,
        departureDate: fmtDate(dep?.departure_date),
        chargeDate: fmtDate(row.balance_next_attempt_at as string),
        amount,
        bookingRef,
        payBalanceUrl: `${APP_URL}/pay-balance?ref=${encodeURIComponent(bookingRef)}&email=${encodeURIComponent(row.lead_email as string)}`,
        nothingPaidYet: Number(row.amount_paid ?? 0) === 0,
      });
      await sendEmail({ to: row.lead_email as string, subject, html, templateName: "balance_heads_up" });
      await sb.from("bookings").update({ balance_heads_up_sent_at: new Date().toISOString() }).eq("id", row.id);
      out.push({ session: row.stripe_session_id, kind: "heads_up" });
    } catch (e) {
      // No stamp, so tomorrow's run tries again.
      console.warn("heads-up email failed", e);
    }
  }
  return out;
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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cron sends {} */ }
  const dry = body.dry_run === true;
  const headsUps = await sendHeadsUps(sb, dry);

  const { data: rows, error } = await sb
    .from("bookings")
    .select(
      "id,stripe_session_id,lead_email,lead_name,group_size,balance_amount,balance_status,booking_ref,reminder_7d_sent_at,departure_id,departures!inner(departure_date,status,trips(slug,days))",
    )
    .eq("spot_number", 1)
    .eq("status", "Confirmed")
    .is("reminder_7d_sent_at", null)
    .gte("departures.departure_date", ymdPlusDays(4))
    .lte("departures.departure_date", ymdPlusDays(6))
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
    const dep = row.departures as { departure_date?: string; trips?: { slug?: string; days?: number } | null } | null;
    const depDate = dep?.departure_date ?? "";
    const tripSlug = dep?.trips?.slug ?? "";
    // Same guest-facing name as the crew heads-up: "14-day Vietnam".
    const countryName = tripSlug.split("-")[0].replace(/^./, (c) => c.toUpperCase());
    const tripName = dep?.trips?.days && countryName ? `${dep.trips.days}-day ${countryName}` : countryName || "your trip";
    const country = tripCountryFromSlug(tripSlug);
    const details = tripFinalDetails(tripSlug);
    const bookingRef =
      (row.booking_ref as string) || (row.stripe_session_id as string);
    const firstName =
      ((row.lead_name as string | null) ?? "").split(" ")[0] || "traveler";

    const balancePaid = row.balance_status === "charged" || row.balance_status === "not_required";
    const today = new Date().toISOString().slice(0, 10);
    const daysToGo = Math.round((Date.parse(depDate + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
    if (dry) {
      results.push({ session: row.stripe_session_id, to: row.lead_email, trip: tripName, departure: depDate, kind: balancePaid ? "countdown" : "reminder", result: "would send" });
      continue;
    }

    if (balancePaid) {
      const { subject, html } = tripCountdownEmail({
        firstName,
        tripCountry: country,
        tripName,
        departureDate: fmtDate(depDate),
        daysToGo,
        bookingRef,
        finalDetailsHtml: details.finalDetailsHtml,
        whatsappUrl: details.whatsappUrl,
      });
      await sendEmail({ to: row.lead_email as string, subject, html, templateName: "trip_countdown_7d" }).catch((e) =>
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
        daysToGo,
        balanceAmount: fmtUsd(balanceTotal),
        payBalanceUrl,
        bookingRef,
        finalDetailsHtml: details.finalDetailsHtml,
        whatsappUrl: details.whatsappUrl,
      });
      await sendEmail({ to: row.lead_email as string, subject, html, templateName: "balance_reminder_7d" }).catch((e) =>
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
    JSON.stringify({ ok: true, dry, processed: results.length, results, headsUps }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
