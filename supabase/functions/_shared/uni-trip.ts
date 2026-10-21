// Uni trip payments (Charlie and Ewan, 21 Oct 2026). The uni trip lives in UNI
// Advisors (the concierge) and is a separate product from ALL IN trips, but it
// takes its money through this site's Stripe: uni-trip-pay opens payments,
// charges saved cards and refunds for it, and stripe-webhook hands paid uni
// sessions to relayUniTripPaid below, which tells UNI Advisors. Nothing here
// writes ALL IN bookings. Table: uni_trip_payments (a log, for support).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@18.5.0";

/** Every uni trip Checkout Session and PaymentIntent carries kind "uni_trip_<purpose>". */
export const UNI_KIND_PREFIX = "uni_trip_";
export const isUniTripKind = (kind: string | null | undefined): boolean =>
  typeof kind === "string" && kind.startsWith(UNI_KIND_PREFIX);

/** UNI Advisors' trip-payment-relay. app_config('uni_advisors_relay_url') overrides it. */
export const DEFAULT_RELAY_URL = "https://bwzobiacowdhcqinxdwh.supabase.co/functions/v1/trip-payment-relay";

/** Customers this flow creates are tagged, so the shared key can only ever charge or refund uni trip customers. */
export const UNI_CUSTOMER_SOURCE = "uni_trip";

export const MIN_PENCE = 50; // Stripe's GBP minimum is 30p
export const MAX_PENCE = 500_000; // £5,000, far above any uni trip

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CUSTOMER = /^cus_[A-Za-z0-9]{6,}$/;
export const PAYMENT_METHOD = /^(pm|card)_[A-Za-z0-9]{6,}$/;
export const PAYMENT_INTENT = /^pi_[A-Za-z0-9]{6,}$/;
export const SLUG = /^[a-z0-9-]{1,60}$/;
export const PURPOSES = ["deposit", "instalments", "extra"] as const;
export type Purpose = (typeof PURPOSES)[number];

export function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function config(sb: SupabaseClient, key: string): Promise<string> {
  const { data } = await sb.from("app_config").select("value").eq("key", key).maybeSingle();
  return String(data?.value ?? "").trim();
}

/** The key UNI Advisors and this site share (also used by ambassador-code). Empty when unset. */
export const uniKey = (sb: SupabaseClient) => config(sb, "uni_advisors_api_key");

/** A whole number of pence inside the uni trip range, or null. */
export function validPence(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= MIN_PENCE && v <= MAX_PENCE ? v : null;
}

/** Where Stripe may send the student back to: an https page, or localhost while testing. */
export function returnUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 500) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))) return u.toString();
  } catch {
    // not a URL
  }
  return null;
}

export const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === "string" ? v : (v?.id ?? null);

export type RelayPayload = {
  event: "checkout.session.completed";
  purpose: string;
  booking_id: string;
  payment_ids: string;
  mode: string;
  amount_pence: number;
  session_id: string;
  customer_id: string | null;
  payment_intent_id: string | null;
  payment_method_id: string | null;
};

/** What UNI Advisors is told about a paid session. Pure, so it's tested. */
export function relayPayload(session: Pick<Stripe.Checkout.Session, "id" | "metadata" | "amount_total" | "customer" | "payment_intent">, paymentMethodId: string | null): RelayPayload {
  const m = (session.metadata ?? {}) as Record<string, string>;
  return {
    event: "checkout.session.completed",
    purpose: (m.kind ?? "").slice(UNI_KIND_PREFIX.length),
    booking_id: m.uni_booking_id ?? "",
    payment_ids: m.payment_ids ?? "",
    mode: m.mode ?? "",
    amount_pence: session.amount_total ?? Number(m.amount_pence ?? 0),
    session_id: session.id,
    customer_id: idOf(session.customer as string | { id: string } | null),
    payment_intent_id: idOf(session.payment_intent as string | { id: string } | null),
    payment_method_id: paymentMethodId,
  };
}

/**
 * A paid uni trip Checkout Session: logged, then relayed to UNI Advisors, which
 * gives the student their spot or marks their payments paid. Never throws.
 * { ok: false } makes stripe-webhook answer 500 so Stripe sends it again; both
 * ends are safe to run twice.
 */
export async function relayUniTripPaid(sb: SupabaseClient, stripe: Stripe, session: Stripe.Checkout.Session): Promise<{ ok: boolean; error?: string }> {
  try {
    if (session.payment_status !== "paid") return { ok: true };
    const piId = idOf(session.payment_intent as string | { id: string } | null);
    let pmId: string | null = null;
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId);
      pmId = idOf(pi.payment_method as string | { id: string } | null);
    }
    const payload = relayPayload(session, pmId);
    if (!UUID.test(payload.booking_id)) {
      console.error("uni trip session without a booking id:", session.id);
      return { ok: true }; // nothing UNI Advisors could do with it; don't make Stripe retry forever
    }
    const now = new Date().toISOString();
    await sb.from("uni_trip_payments").upsert({
      kind: "checkout",
      status: "paid",
      purpose: payload.purpose,
      uni_booking_id: payload.booking_id,
      uni_payment_ids: payload.payment_ids || null,
      uni_slug: (session.metadata as Record<string, string> | null)?.uni_slug ?? null,
      amount_pence: payload.amount_pence,
      currency: session.currency ?? "gbp",
      stripe_session_id: session.id,
      stripe_payment_intent_id: piId,
      stripe_customer_id: payload.customer_id,
      updated_at: now,
    }, { onConflict: "stripe_session_id" });

    const [key, override] = await Promise.all([uniKey(sb), config(sb, "uni_advisors_relay_url")]);
    if (!key) return await relayFailed(sb, session.id, "uni_advisors_api_key isn't set");
    const res = await fetch(override || DEFAULT_RELAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-secret": key },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return await relayFailed(sb, session.id, `UNI Advisors said ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await sb.from("uni_trip_payments").update({ relayed_at: new Date().toISOString(), relay_error: null }).eq("stripe_session_id", session.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("uni trip relay failed:", msg);
    return { ok: false, error: msg };
  }
}

async function relayFailed(sb: SupabaseClient, sessionId: string, error: string) {
  console.error("uni trip relay failed:", sessionId, error);
  await sb.from("uni_trip_payments").update({ relay_error: error.slice(0, 300), updated_at: new Date().toISOString() }).eq("stripe_session_id", sessionId);
  return { ok: false, error };
}
