// Trip builder: the guest chooses how to pay the rest (Ewan, 20 Oct 2026). POST JSON { ref, k, plan, n? }.
//   plan "now"          pay the whole balance on a Checkout page
//   plan "later"        the card they paid the deposit with is charged a week before they leave; they are booked straight away
//   plan "instalments"  the first payment on a Checkout page now, the rest charged to that card every 30 days
//   plan "due"          pay a payment that was missed (or is due) by hand, on a Checkout page
// `k` is the key from the link in the "your trip is checked" email (guest key, one trip, 90 days).
// The rules (who is offered what) live in _shared/trip-builder-pay.ts; this only applies them and talks to Stripe.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { guestTripUrl, signGuestKey, verifyGuestKey } from "../_shared/trip-builder-crew.ts";
import { buildSchedule, isoDay, payOptions, type Plan, readSchedule } from "../_shared/trip-builder-pay.ts";
import { notifyBooked, usd } from "../_shared/trip-builder.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!url || !key || !stripeKey) return json({ error: "Payments aren't set up yet." }, 503);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ref = typeof b.ref === "string" ? b.ref.trim().toUpperCase() : "";
  const plan = typeof b.plan === "string" ? b.plan : "";
  if (!/^MM-[A-Z0-9]{6}$/.test(ref)) return json({ error: "Unknown trip" }, 404);
  if (!(await verifyGuestKey(ref, b.k))) return json({ error: "This link has expired. Use the link in your latest email from us, or reply to it and we'll send a new one." }, 401);
  if (!["now", "later", "instalments", "due"].includes(plan)) return json({ error: "Pick how you'd like to pay." }, 400);

  const sb = createClient(url, key);
  const { data: row, error } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (error) return json({ error: "Couldn't look that up. Try again." }, 500);
  if (!row) return json({ error: "Unknown trip" }, 404);
  const origin = req.headers.get("origin");
  const gkey = await signGuestKey(ref);
  const back = guestTripUrl(origin, ref, gkey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const now = new Date(), nowIso = now.toISOString();
  const checkout = async (amount: number, kind: string, n: number, what: string) => {
    const s = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(row.stripe_customer_id ? { customer: row.stripe_customer_id as string } : { customer_email: (row.guest_email as string | null) || (row.email as string | null) || undefined }),
      line_items: [{ price_data: { currency: "usd", unit_amount: Math.round(amount * 100), product_data: { name: `Mad Monkey trip: ${what}`, description: `${String(row.route ?? "").slice(0, 200)} · ref ${ref}` } }, quantity: 1 }],
      success_url: back, cancel_url: back,
      metadata: { kind, ref, n: String(n), origin: origin ?? "" },
      payment_intent_data: { description: `Trip builder ${what} · ref ${ref}`, metadata: { kind, ref, n: String(n) } },
    });
    return s.url as string;
  };

  try {
    // A payment that was missed or is due: pay it by hand.
    if (plan === "due") {
      const items = readSchedule(row.pay_schedule), today = isoDay(now);
      const t = items.find((i) => i.how === "card" && (i.status === "failed" || (i.status === "pending" && i.due <= today)));
      if (!t) return json({ error: "There's nothing due to pay right now." }, 409);
      return json({ ok: true, checkoutUrl: await checkout(t.amount, "trip_builder_instalment", t.n, `payment ${t.n} of ${items.length}`) });
    }

    // Already booked on this plan (a double tap, or going back to the page): say so rather than an error.
    if (String(row.status) === "approved") {
      if (row.pay_plan === plan) return json({ ok: true, booked: true, plan, schedule: readSchedule(row.pay_schedule) });
      return json({ error: "You're already booked. Reply to your email if you'd like to change how you pay." }, 409);
    }
    if (String(row.status) !== "ready" || !(Number(row.balance_amount) >= 1)) return json({ error: "The crew hasn't finished checking this trip yet." }, 409);

    const balance = Number(row.balance_amount);
    const offered = payOptions({ balance, start: row.start_date as string | null, cardSaved: !!row.stripe_payment_method_id, now });
    if (!offered.some((o) => o.plan === plan)) return json({ error: "That way of paying isn't available for this trip. Pick one of the others." }, 400);
    const items = buildSchedule(plan as Plan, balance, row.start_date as string | null, now);

    if (plan === "later") {
      // Booked now, charged to the saved card a week before they leave.
      const { data: won, error: uErr } = await sb.from("trip_builder_requests").update({ pay_plan: "later", pay_schedule: items, plan_chosen_at: nowIso, status: "approved", updated_at: nowIso }).eq("ref", ref).eq("status", "ready").select("ref");
      if (uErr) return json({ error: "Couldn't save that. Try again." }, 500);
      // A double tap: the other request booked it first, so don't send the emails twice.
      if (!won || !won.length) return json({ ok: true, booked: true, plan });
      await notifyBooked({ ...row, pay_plan: "later", status: "approved" }, items, origin, gkey);
      return json({ ok: true, booked: true, plan, schedule: items });
    }

    // Now / instalments: save the plan, then send them to pay the first payment. They are booked when it lands (stripe-webhook).
    const { error: uErr } = await sb.from("trip_builder_requests").update({ pay_plan: plan, pay_schedule: items, updated_at: nowIso }).eq("ref", ref);
    if (uErr) return json({ error: "Couldn't save that. Try again." }, 500);
    const first = items[0];
    const checkoutUrl = await checkout(first.amount, plan === "now" ? "trip_builder_balance" : "trip_builder_instalment", 1, plan === "now" ? "balance" : `payment 1 of ${items.length}`);
    return json({ ok: true, checkoutUrl, plan, first: { amount: first.amount, label: usd(first.amount) } });
  } catch (e) {
    console.error("trip builder pay failed:", e instanceof Error ? e.message : e);
    return json({ error: "Payment couldn't start. Try again in a moment." }, 502);
  }
});
