// Daily job: cancel pending departures that haven't reached the 5-traveller
// minimum by 30 days out, refund every deposit (and any collected balance),
// and email each lead booker. Idempotent by design:
// - departures.status='pending' → 'cancelled' guard so re-runs skip work.
// - Stripe refund idempotencyKey per session so re-runs never double-refund.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL, departureCancelledEmail, sendEmail } from "../_shared/email.ts";

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)} USD`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch { return d ?? ""; }
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

  // Fail-closed cron secret guard.
  const providedCronSecret = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultCronSecret, error: vaultCronSecretError } = await sb.rpc("get_cron_secret");
  if (vaultCronSecretError) {
    console.error("cron secret lookup failed:", vaultCronSecretError.message);
    return new Response("cron secret unavailable", { status: 503, headers: corsHeaders });
  }
  const cronSecret = normalizeCronSecret(typeof vaultCronSecret === "string" ? vaultCronSecret : null);
  if (!cronSecret || providedCronSecret !== cronSecret) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  // Departures still pending inside the 30-day window = failed to fill.
  const { data: departures, error: depErr } = await sb
    .from("departures")
    .select("id,departure_date,trip_id,trips(name,slug)")
    .eq("status", "pending")
    .lte("departure_date", cutoffIso);

  if (depErr) {
    console.error("departure query failed:", depErr.message);
    return new Response(JSON.stringify({ error: depErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary: Array<Record<string, unknown>> = [];

  for (const dep of departures ?? []) {
    const depId = dep.id as string;
    const tripInfo = (dep.trips as { name?: string; slug?: string } | null) ?? {};
    const tripName = tripInfo.name ?? "your trip";
    const tripSlug = tripInfo.slug ?? "";
    const departureDate = fmtDate(dep.departure_date as string);
    const depSummary: Record<string, unknown> = { departureId: depId, departureDate, refunds: [] as unknown[] };

    try {
      // Read confirmed bookings BEFORE flipping so we can tell solo from squad.
      const { data: bookings, error: bkErr } = await sb
        .from("bookings")
        .select("id,stripe_session_id,stripe_payment_intent_id,stripe_balance_payment_intent_id,amount_paid,group_size,spot_number,lead_email,lead_name,lead_solo")
        .eq("departure_id", depId)
        .eq("status", "Confirmed");
      if (bkErr) throw new Error(`bookings query failed: ${bkErr.message}`);

      const soloBookings = (bookings ?? []).filter((b) => b.lead_solo === true);
      const squadBookings = (bookings ?? []).filter((b) => b.lead_solo !== true);
      const hasSolo = soloBookings.length > 0;
      // Solo travellers are exempt from the 5-minimum, so the departure still runs for them.
      const targetStatus = hasSolo ? "confirmed" : "cancelled";
      const stampCol = hasSolo ? "confirmed_at" : "cancelled_at";

      // One-way status flip, guarded on 'pending', so re-runs skip already-processed departures.
      const { data: flipped, error: flipErr } = await sb
        .from("departures")
        .update({ status: targetStatus, [stampCol]: new Date().toISOString() })
        .eq("id", depId)
        .eq("status", "pending")
        .select("id");
      if (flipErr) throw new Error(`status flip failed: ${flipErr.message}`);
      if (!flipped || flipped.length === 0) {
        summary.push({ ...depSummary, skipped: "already_processed" });
        continue;
      }

      // Only squad (non-solo) bookings get cancelled + refunded. Group by stripe_session_id.
      const groups = new Map<string, typeof squadBookings>();
      for (const b of squadBookings) {
        const sid = (b.stripe_session_id as string) ?? "";
        if (!sid) continue;
        if (!groups.has(sid)) groups.set(sid, [] as typeof squadBookings);
        groups.get(sid)!.push(b);
      }

      for (const [sessionId, rows] of groups.entries()) {
        const lead = rows.find((r) => Number(r.spot_number ?? 1) === 1) ?? rows[0];
        const depositPi = lead?.stripe_payment_intent_id as string | null;
        const balancePi = lead?.stripe_balance_payment_intent_id as string | null;
        let depositRefundId: string | null = null;
        let balanceRefundId: string | null = null;
        let refundedCents = 0;
        const errors: string[] = [];

        // Deposit refund.
        if (depositPi) {
          try {
            const r = await stripe.refunds.create(
              { payment_intent: depositPi },
              { idempotencyKey: `cancel-refund:${sessionId}` },
            );
            depositRefundId = r.id;
            refundedCents += r.amount ?? 0;
          } catch (e) {
            errors.push(`deposit: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          errors.push("deposit: no payment_intent on file");
        }

        // Balance refund (usually not yet charged 30 days out — defensive).
        if (balancePi) {
          try {
            const r = await stripe.refunds.create(
              { payment_intent: balancePi },
              { idempotencyKey: `cancel-refund-balance:${sessionId}` },
            );
            balanceRefundId = r.id;
            refundedCents += r.amount ?? 0;
          } catch (e) {
            errors.push(`balance: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // Mark all rows for this session cancelled + stop the balance charger.
        const { error: updErr } = await sb
          .from("bookings")
          .update({
            status: "Cancelled",
            balance_status: "cancelled",
            balance_next_attempt_at: null,
            stripe_refund_id: depositRefundId,
            stripe_balance_refund_id: balanceRefundId,
          })
          .eq("stripe_session_id", sessionId);
        if (updErr) errors.push(`db update: ${updErr.message}`);

        // Email the lead booker (best-effort; failure doesn't block others).
        if (lead?.lead_email) {
          try {
            const firstName = ((lead.lead_name as string | null) ?? "").split(" ")[0] || "traveler";
            const paidCentsFallback = Math.round(Number(lead.amount_paid ?? 0) * Number(lead.group_size ?? 1) * 100);
            const amountCents = refundedCents > 0 ? refundedCents : paidCentsFallback;
            const { subject, html } = departureCancelledEmail({
              firstName,
              tripName,
              departureDate,
              amount: fmtUsd(amountCents),
              tripUrl: tripSlug ? `${APP_URL}/${tripSlug}` : APP_URL,
            });
            await sendEmail({ to: lead.lead_email as string, subject, html });
          } catch (e) {
            errors.push(`email: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        (depSummary.refunds as unknown[]).push({
          sessionId,
          depositRefundId,
          balanceRefundId,
          refundedCents,
          errors: errors.length ? errors : undefined,
        });
      }

      summary.push({ ...depSummary, outcome: hasSolo ? "confirmed_for_solo" : "cancelled", soloKept: soloBookings.length, squadCancelledGroups: groups.size });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`departure ${depId} failed:`, msg);
      summary.push({ ...depSummary, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: summary.length, summary }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
