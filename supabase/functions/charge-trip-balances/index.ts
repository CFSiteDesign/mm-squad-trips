// Daily job: auto-charge remaining balances for deposit bookings 7 days before departure.
// - Finds lead bookings (spot_number = 1) where balance is due and not yet charged.
// - Creates an off_session PaymentIntent on the saved customer + payment method.
// - On success: marks all rows of that session as charged (status stays Confirmed).
// - On failure: increments attempts, sets balance_last_error, schedules retry in 2 days.
//   Stops retrying after the departure date passes.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RETRY_DAYS = 2;
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
  if (cronSecret && providedCronSecret !== cronSecret) {
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
    .select("id,stripe_session_id,stripe_customer_id,stripe_payment_method_id,balance_amount,balance_attempts,balance_due_date,group_size,lead_email,lead_name,trip_id,departure_id,departures(departure_date)")
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
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
