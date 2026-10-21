// Uni trip payments, for UNI Advisors (Charlie and Ewan, 21 Oct 2026). The uni
// trip is its own product, kept separate from ALL IN trips; this only moves its
// money on this site's Stripe so it needs no second Stripe account. The bookings,
// plan, ladder and commission live in UNI Advisors (see _shared/uni-trip.ts).
//
// Called by UNI Advisors' functions (different Supabase project, no JWT).
// Auth: x-api-secret header vs app_config('uni_advisors_api_key'), the key
// ambassador-code already uses.
//
// POST { action: "checkout", booking_id, uni_slug, purpose: deposit|instalments|extra,
//        amount_pence, name, description?, email?, customer_id?, save_card,
//        payment_ids?, mode?, success_url, cancel_url }
//   -> { url, session_id, customer_id }    a GBP Stripe Checkout for the student
// POST { action: "charge", booking_id, payment_id, customer_id, payment_method_id,
//        amount_pence, idempotency_key }
//   -> { status: "succeeded" | "failed" | <other PaymentIntent status>, payment_intent_id, error? }
//      An instalment off the card saved at checkout. A decline is { status: "failed" } with 200.
// POST { action: "refund", booking_id, refunds: [{ payment_intent_id, amount_pence }] }
//   -> { refunds: [{ payment_intent_id, refund_id, amount_pence, status }] }
//
// Guard rails: only customers this flow created (metadata.source = "uni_trip")
// can be charged, only PaymentIntents tagged with the same uni booking can be
// refunded, amounts stay between 50p and £5,000, currency is always GBP.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CUSTOMER,
  isUniTripKind,
  PAYMENT_INTENT,
  PAYMENT_METHOD,
  PURPOSES,
  returnUrl,
  safeEqual,
  SLUG,
  UNI_CUSTOMER_SOURCE,
  UNI_KIND_PREFIX,
  uniKey,
  UUID,
  validPence,
  type Purpose,
} from "../_shared/uni-trip.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

class Bad extends Error {}

function stripeMessage(e: unknown): string {
  const raw = (e as { raw?: { message?: string } })?.raw?.message;
  return raw ?? (e instanceof Error ? e.message : String(e));
}

/** A customer this flow made, or a Bad error. */
async function uniCustomer(stripe: Stripe, id: string) {
  if (!CUSTOMER.test(id)) throw new Bad("customer_id isn't a Stripe customer");
  const c = await stripe.customers.retrieve(id);
  if ((c as Stripe.DeletedCustomer).deleted || (c as Stripe.Customer).metadata?.source !== UNI_CUSTOMER_SOURCE) {
    throw new Bad("That customer isn't a uni trip customer");
  }
  return c as Stripe.Customer;
}

async function checkout(stripe: Stripe, sb: SupabaseClient, p: Record<string, unknown>) {
  const bookingId = str(p.booking_id, 40);
  const slug = str(p.uni_slug, 60);
  const purpose = str(p.purpose, 20) as Purpose;
  const amount = validPence(p.amount_pence);
  const name = str(p.name, 120);
  const description = str(p.description, 300);
  const email = str(p.email, 200);
  const success = returnUrl(p.success_url);
  const cancel = returnUrl(p.cancel_url);
  const paymentIds = str(p.payment_ids, 600);
  const mode = str(p.mode, 20);
  if (!UUID.test(bookingId) || !SLUG.test(slug) || !PURPOSES.includes(purpose) || !amount || !name || !success || !cancel) {
    throw new Bad("checkout needs booking_id, uni_slug, purpose, amount_pence (50 to 500000), name, success_url and cancel_url");
  }
  if (paymentIds && !paymentIds.split(",").every((id) => UUID.test(id))) throw new Bad("payment_ids must be uuids");

  const customer = typeof p.customer_id === "string" && p.customer_id
    ? await uniCustomer(stripe, p.customer_id)
    : await stripe.customers.create({
      ...(email ? { email } : {}),
      description: `Uni trip booker (${slug})`,
      metadata: { source: UNI_CUSTOMER_SOURCE, uni_booking_id: bookingId, uni_slug: slug },
    });

  const kind = `${UNI_KIND_PREFIX}${purpose}`;
  const metadata: Record<string, string> = {
    kind,
    uni_booking_id: bookingId,
    uni_slug: slug,
    amount_pence: String(amount),
    ...(paymentIds ? { payment_ids: paymentIds } : {}),
    ...(mode ? { mode } : {}),
  };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    line_items: [{
      quantity: 1,
      price_data: { currency: "gbp", unit_amount: amount, product_data: { name, ...(description ? { description } : {}) } },
    }],
    payment_intent_data: {
      description: `Mad Monkey uni trip (${slug}): ${purpose}`,
      metadata,
      // Kept for the weekly or monthly instalments.
      ...(p.save_card === true ? { setup_future_usage: "off_session" as const } : {}),
    },
    metadata,
    success_url: success,
    cancel_url: cancel,
  });
  await sb.from("uni_trip_payments").insert({
    kind: "checkout",
    status: "open",
    purpose,
    uni_booking_id: bookingId,
    uni_payment_ids: paymentIds || null,
    uni_slug: slug,
    amount_pence: amount,
    stripe_session_id: session.id,
    stripe_customer_id: customer.id,
  });
  return json({ url: session.url, session_id: session.id, customer_id: customer.id });
}

async function charge(stripe: Stripe, sb: SupabaseClient, p: Record<string, unknown>) {
  const bookingId = str(p.booking_id, 40);
  const paymentId = str(p.payment_id, 40);
  const pm = str(p.payment_method_id, 80);
  const amount = validPence(p.amount_pence);
  const idem = str(p.idempotency_key, 120);
  if (!UUID.test(bookingId) || !UUID.test(paymentId) || !PAYMENT_METHOD.test(pm) || !amount || !/^[A-Za-z0-9_-]{8,120}$/.test(idem)) {
    throw new Bad("charge needs booking_id, payment_id, customer_id, payment_method_id, amount_pence and idempotency_key");
  }
  const customer = await uniCustomer(stripe, str(p.customer_id, 80));
  const log = { kind: "charge", purpose: "instalment", uni_booking_id: bookingId, uni_payment_ids: paymentId, amount_pence: amount, stripe_customer_id: customer.id };
  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      customer: customer.id,
      payment_method: pm,
      off_session: true,
      confirm: true,
      description: "Mad Monkey uni trip instalment",
      metadata: { kind: `${UNI_KIND_PREFIX}instalment`, uni_booking_id: bookingId, uni_payment_id: paymentId },
    }, { idempotencyKey: `uni-${idem}` });
    await sb.from("uni_trip_payments").insert({ ...log, status: pi.status, stripe_payment_intent_id: pi.id });
    return json({ status: pi.status, payment_intent_id: pi.id });
  } catch (e) {
    // Declines and "the bank wants the student to confirm" land here: a normal outcome, not an outage.
    if ((e as { type?: string })?.type === "StripeCardError") {
      const error = stripeMessage(e);
      const piId = (e as { raw?: { payment_intent?: { id?: string } } })?.raw?.payment_intent?.id ?? null;
      await sb.from("uni_trip_payments").insert({ ...log, status: "failed", stripe_payment_intent_id: piId, error: error.slice(0, 300) });
      return json({ status: "failed", payment_intent_id: piId, error });
    }
    throw e;
  }
}

async function refund(stripe: Stripe, sb: SupabaseClient, p: Record<string, unknown>) {
  const bookingId = str(p.booking_id, 40);
  const list = Array.isArray(p.refunds) ? p.refunds : [];
  if (!UUID.test(bookingId) || !list.length || list.length > 60) throw new Bad("refund needs booking_id and 1 to 60 refunds");
  const items = list.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const pi = str(o.payment_intent_id, 80);
    const amount = typeof o.amount_pence === "number" && Number.isInteger(o.amount_pence) && o.amount_pence > 0 && o.amount_pence <= 500_000 ? o.amount_pence : null;
    if (!PAYMENT_INTENT.test(pi) || !amount) throw new Bad("each refund needs payment_intent_id and amount_pence");
    return { pi, amount };
  });
  const done: { payment_intent_id: string; refund_id: string; amount_pence: number; status: string | null }[] = [];
  for (const { pi, amount } of items) {
    const intent = await stripe.paymentIntents.retrieve(pi);
    if (!isUniTripKind(intent.metadata?.kind) || intent.metadata?.uni_booking_id !== bookingId) {
      throw new Bad(`${pi} isn't a payment for this uni trip booking`);
    }
    try {
      // Same booking, payment and amount: Stripe hands back the first refund instead of a second one.
      const r = await stripe.refunds.create({
        payment_intent: pi,
        amount,
        metadata: { kind: `${UNI_KIND_PREFIX}refund`, uni_booking_id: bookingId },
      }, { idempotencyKey: `uni-refund-${bookingId}-${pi}-${amount}` });
      await sb.from("uni_trip_payments").insert({
        kind: "refund", status: r.status ?? "pending", purpose: "refund", uni_booking_id: bookingId, amount_pence: amount,
        stripe_payment_intent_id: pi, stripe_refund_id: r.id,
      });
      done.push({ payment_intent_id: pi, refund_id: r.id, amount_pence: amount, status: r.status ?? null });
    } catch (e) {
      const error = stripeMessage(e);
      await sb.from("uni_trip_payments").insert({
        kind: "refund", status: "failed", purpose: "refund", uni_booking_id: bookingId, amount_pence: amount,
        stripe_payment_intent_id: pi, error: error.slice(0, 300),
      });
      return json({ error: `Stripe wouldn't refund ${pi}: ${error}`, refunds: done }, 502);
    }
  }
  return json({ refunds: done });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !url || !key) return json({ error: "Payments aren't set up yet." }, 503);
  const sb = createClient(url, key);

  const expected = await uniKey(sb);
  const presented = (req.headers.get("x-api-secret") ?? "").trim();
  if (!expected) return json({ error: "Endpoint unavailable" }, 503);
  if (!safeEqual(presented, expected)) return json({ error: "Unauthorized" }, 401);

  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  try {
    if (p.action === "checkout") return await checkout(stripe, sb, p);
    if (p.action === "charge") return await charge(stripe, sb, p);
    if (p.action === "refund") return await refund(stripe, sb, p);
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof Bad) return json({ error: e.message }, 400);
    console.error("uni-trip-pay failed:", stripeMessage(e));
    return json({ error: "Stripe call failed" }, 502);
  }
});
