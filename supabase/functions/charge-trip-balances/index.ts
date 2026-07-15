// Daily job: auto-charge remaining balances for deposit bookings 7 days before departure.
// - Finds lead bookings (spot_number = 1) where balance is due and not yet charged.
// - Creates an off_session PaymentIntent on the saved customer + payment method.
// - On success: marks all rows of that session as charged (status stays Confirmed).
// - On failure: increments attempts, sets balance_last_error, schedules retry in 2 days.
//   Stops retrying after the departure date passes.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL, balanceFailedEmail, balancePaidEmail, sendEmail } from "../_shared/email.ts";

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)} USD`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return d;
  }
}

const RETRY_DAYS = 2;

// GA4 Measurement Protocol — reports the balance charge server-side so this
// product's GA4 revenue reflects the full trip price, not just the deposit
// captured client-side at booking. Inert until both secrets are set in the
// Supabase project (Settings → Edge Functions → Secrets):
//   GA4_MEASUREMENT_ID  (e.g. G-XXXXXXXXXX — the GA4 web data stream)
//   GA4_MP_API_SECRET   (GA4 Admin → Data Streams → Measurement Protocol API secrets)
const GA4_MEASUREMENT_ID = Deno.env.get("GA4_MEASUREMENT_ID");
const GA4_MP_API_SECRET = Deno.env.get("GA4_MP_API_SECRET");

async function sendBalancePurchaseToGa4(opts: {
  clientId: string;
  sessionId: string;
  value: number;
  tripName: string;
  tripSlug: string;
  groupSize: number;
  perSpotBalance: number;
}): Promise<string> {
  // Not configured yet → no-op (safe for production before Alexeis provisions the secret).
  if (!GA4_MEASUREMENT_ID || !GA4_MP_API_SECRET) return "skipped:not_configured";
  // No client id means the visitor declined analytics cookies at booking
  // (no _ga cookie existed) — skip rather than manufacture tracking they opted out of.
  if (!opts.clientId) return "skipped:no_client_id";
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_MP_API_SECRET}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: opts.clientId,
          events: [{
            name: "purchase",
            params: {
              // Distinct from the deposit-moment purchase (which uses the bare
              // session id) so GA4 does not dedupe the two — deposit + balance
              // then sum to the full trip price.
              transaction_id: `${opts.sessionId}-balance`,
              currency: "USD",
              value: opts.value,
              conversion_type: "all_in",
              items: [{
                item_id: opts.tripSlug || opts.tripName,
                item_name: opts.tripName,
                item_brand: "Mad Monkey",
                item_category: "All In",
                item_list_id: "all-in-trips",
                item_list_name: "All In Trips",
                item_variant: "Balance",
                price: opts.perSpotBalance,
                quantity: opts.groupSize,
              }],
            },
          }],
        }),
      },
    );
    return res.ok ? "sent" : `error:http_${res.status}`;
  } catch (e) {
    return `error:${e instanceof Error ? e.message : String(e)}`;
  }
}
const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !sbUrl || !sbKey) {
    return new Response("not configured", { status: 503, headers: corsHeaders });
  }
  const sb = createClient(sbUrl, sbKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Shared-secret guard. Read the expected value from the same Vault-backed
  // database helper the scheduled job uses so there is only one source of truth.
  const rawProvidedCronSecret = req.headers.get("x-cron-secret");
  const providedCronSecret = normalizeCronSecret(rawProvidedCronSecret);
  const { data: vaultCronSecret, error: vaultCronSecretError } = await sb.rpc("get_cron_secret");

  if (vaultCronSecretError) {
    console.error("cron secret lookup failed:", vaultCronSecretError.message);
    return new Response("cron secret unavailable", { status: 503, headers: corsHeaders });
  }

  const cronSecret = normalizeCronSecret(typeof vaultCronSecret === "string" ? vaultCronSecret : null);
  if (!cronSecret || providedCronSecret !== cronSecret) {
    console.warn("cron secret mismatch", {
      headerLength: rawProvidedCronSecret?.length ?? 0,
      headerNormalizedLength: providedCronSecret.length,
      vaultNormalizedLength: cronSecret.length,
    });
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // Get all lead rows that are due
  const { data: due, error } = await sb
    .from("bookings")
    .select("id,stripe_session_id,stripe_customer_id,stripe_payment_method_id,balance_amount,balance_attempts,balance_due_date,group_size,lead_email,lead_name,trip_id,departure_id,booking_ref,trips(name,slug),departures(departure_date)")
    .in("balance_status", ["scheduled", "failed"])
    .eq("spot_number", 1)
    .lte("balance_next_attempt_at", nowIso);

  if (error) {
    console.error("query failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const row of due ?? []) {
    const sessionId = row.stripe_session_id as string;
    const depDate = (row.departures as { departure_date?: string } | null)?.departure_date ?? null;
    const totalCents = Math.round(Number(row.balance_amount) * Number(row.group_size) * 100);

    // Past departure → give up
    if (depDate && depDate < today) {
      await sb.from("bookings")
        .update({ balance_status: "failed_final", balance_last_error: "departure passed without successful charge", balance_next_attempt_at: null })
        .eq("stripe_session_id", sessionId);
      results.push({ sessionId, skipped: "past_departure" });
      continue;
    }

    if (!row.stripe_customer_id || !row.stripe_payment_method_id || totalCents <= 0) {
      await sb.from("bookings")
        .update({ balance_status: "failed_final", balance_last_error: "missing card-on-file", balance_next_attempt_at: null })
        .eq("stripe_session_id", sessionId);
      results.push({ sessionId, skipped: "no_card" });
      continue;
    }

    try {
      const pi = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        customer: row.stripe_customer_id as string,
        payment_method: row.stripe_payment_method_id as string,
        off_session: true,
        confirm: true,
        description: `Trip balance · session ${sessionId}`,
        metadata: {
          stripe_session_id: sessionId,
          kind: "balance",
          trip_id: String(row.trip_id ?? ""),
          departure_id: String(row.departure_id ?? ""),
        },
      }, {
        // Idempotency: if this run double-fires (or a charge succeeds but the DB
        // update fails and the cron re-picks it within Stripe's 24h key window),
        // Stripe returns the same PaymentIntent instead of charging twice.
        idempotencyKey: `balance:${sessionId}`,
      });

      await sb.from("bookings").update({
        balance_status: "charged",
        balance_charged_at: new Date().toISOString(),
        balance_last_error: null,
        balance_next_attempt_at: null,
        stripe_balance_payment_intent_id: pi.id,
        payment_type: "Full",
      }).eq("stripe_session_id", sessionId);

      // Also bump amount_paid per spot to include the balance
      const { data: rows } = await sb.from("bookings")
        .select("id,amount_paid,balance_amount")
        .eq("stripe_session_id", sessionId);
      for (const r of rows ?? []) {
        const paid = Number(r.amount_paid ?? 0) + Number(r.balance_amount ?? 0);
        await sb.from("bookings").update({ amount_paid: Math.round(paid * 100) / 100 }).eq("id", r.id);
      }

      results.push({ sessionId, charged: totalCents });
      console.log(`✓ charged ${totalCents} for ${sessionId} (pi ${pi.id})`);

      // Receipt email to the lead booker
      if (row.lead_email) {
        const tripName = (row.trips as { name?: string } | null)?.name ?? "your trip";
        const chargedAmount = totalCents / 100;
        const perSpotFinal = Number(row.balance_amount) + Number((rows ?? [])[0]?.amount_paid ?? 0);
        const totalPaid = perSpotFinal * Number(row.group_size);
        const { subject, html } = balancePaidEmail({
          firstName: ((row.lead_name as string | null) ?? "").split(" ")[0] || "traveler",
          tripName,
          departureDate: fmtDate(depDate),
          spots: row.group_size as number,
          amountCharged: fmtUsd(chargedAmount),
          totalPaid: fmtUsd(totalPaid),
          bookingRef: (row.booking_ref as string) || sessionId,
          bookingUrl: `${APP_URL}/booking-success?session_id=${encodeURIComponent(sessionId)}`,
        });
        sendEmail({ to: row.lead_email as string, subject, html }).catch((e) =>
          console.warn("balance-paid email failed", e),
        );
      }

      // Report the balance charge to GA4 (Measurement Protocol) so revenue for
      // this product isn't stuck at the deposit amount. The GA client id was
      // captured at booking and lives on the original Checkout Session metadata.
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        const gaClientId = (checkoutSession.metadata?.ga_client_id as string | undefined) ?? "";
        const gaStatus = await sendBalancePurchaseToGa4({
          clientId: gaClientId,
          sessionId,
          value: totalCents / 100,
          tripName: (row.trips as { name?: string } | null)?.name ?? "",
          tripSlug: (row.trips as { slug?: string } | null)?.slug ?? "",
          groupSize: Number(row.group_size),
          perSpotBalance: Number(row.balance_amount),
        });
        console.log(`GA4 balance purchase for ${sessionId}: ${gaStatus}`);
      } catch (e) {
        console.warn("GA4 balance purchase reporting failed", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = Number(row.balance_attempts ?? 0) + 1;
      const next = new Date();
      next.setUTCDate(next.getUTCDate() + RETRY_DAYS);
      next.setUTCHours(14, 0, 0, 0);

      await sb.from("bookings").update({
        balance_status: "failed",
        balance_attempts: attempts,
        balance_last_error: msg.slice(0, 500),
        balance_next_attempt_at: next.toISOString(),
      }).eq("stripe_session_id", sessionId);

      results.push({ sessionId, error: msg, attempts, nextAttempt: next.toISOString() });
      console.warn(`✗ charge failed for ${sessionId}: ${msg} (attempt ${attempts}, retry ${next.toISOString()})`);

      // Notify the lead booker so they can update their card
      if (row.lead_email) {
        const tripName = (row.trips as { name?: string } | null)?.name ?? "your trip";
        const totalDue = (totalCents / 100);
        const { subject, html } = balanceFailedEmail({
          firstName: ((row.lead_name as string | null) ?? "").split(" ")[0] || "traveler",
          tripName,
          departureDate: fmtDate(depDate),
          amountDue: fmtUsd(totalDue),
          attempts,
          nextAttemptDate: fmtDate(next.toISOString()),
          bookingRef: (row.booking_ref as string) || sessionId,
        });
        sendEmail({ to: row.lead_email as string, subject, html }).catch((e) =>
          console.warn("balance-failed email failed", e),
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
