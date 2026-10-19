// Trip builder: "Hold my beds + get it checked" (Charlie, 19 Oct 2026).
// The builder (public/trip-builder) posts the guest's whole plan here (Ewan's
// lead payload, docs in his repo's docs/LEADS.md, plus deposit.people). We save
// it as pending_payment and return a Stripe Checkout link for the deposit:
// $50 per person, charged here, never trusted from the browser. stripe-webhook
// marks it paid (_shared/trip-builder.ts) and it shows up in Admin > Trip builder.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { builderStatusUrl, DEPOSIT_PER_PERSON_USD, HOLD_HOURS, MAX_PEOPLE } from "../_shared/trip-builder.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function newRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let o = "MM-";
  for (const b of crypto.getRandomValues(new Uint8Array(6))) o += a[b % a.length];
  return o;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !url || !key) return json({ error: "Payments aren't set up yet." }, 503);

  const raw = await req.text();
  if (raw.length > 200_000) return json({ error: "That trip is too big to send." }, 413);
  let p: Record<string, unknown>;
  try { p = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const contact = (p.contact ?? {}) as Record<string, unknown>;
  const trip = (p.trip ?? {}) as Record<string, unknown>;
  const deposit = (p.deposit ?? {}) as Record<string, unknown>;
  const name = str(contact.name, 80);
  const via = contact.via === "whatsapp" ? "whatsapp" : "email";
  const email = str(contact.email, 200).toLowerCase();
  const whatsapp = str(contact.whatsapp, 30);
  if (!name) return json({ error: "Pop your first name in." }, 400);
  if (contact.consent !== true) return json({ error: "Tick the box so we're allowed to reply." }, 400);
  if (via === "email" ? !EMAIL.test(email) : whatsapp.replace(/\D/g, "").length < 8) {
    return json({ error: via === "email" ? "That email doesn't look right." : "That WhatsApp number doesn't look right." }, 400);
  }
  const days = Math.round(Number(trip.days) || 0);
  const route = str(trip.route, 400);
  if (!route || days < 1) return json({ error: "Add a stop to your trip first." }, 400);

  const people = Math.min(MAX_PEOPLE, Math.max(1, Math.round(Number(deposit.people ?? contact.partySize) || 1)));
  const depositUsd = DEPOSIT_PER_PERSON_USD * people;
  const start = typeof trip.start === "string" && DATE.test(trip.start) ? trip.start : null;
  const origin = req.headers.get("origin");
  const sb = createClient(url, key);

  // Save first, with a fresh reference (retry on the unlikely clash).
  let ref = "";
  for (let i = 0; i < 5 && !ref; i++) {
    const candidate = newRef();
    const { error } = await sb.from("trip_builder_requests").insert({
      ref: candidate,
      status: "pending_payment",
      name,
      contact_via: via,
      email: email || null,
      whatsapp: whatsapp || null,
      from_place: str(contact.from, 120) || null,
      party_size: people,
      dates_flex: str(contact.dates, 20) || null,
      start_date: start,
      route,
      days,
      nights: Math.round(Number(trip.nights) || 0) || null,
      stops: Array.isArray(trip.stops) ? trip.stops.map((s) => str(s, 60)).filter(Boolean).slice(0, 40) : [],
      countries: Array.isArray(trip.countries) ? trip.countries.map((s) => str(s, 4)).filter(Boolean).slice(0, 10) : [],
      est_total_usd: Number.isFinite(Number(trip.estTotalUsd)) ? Number(trip.estTotalUsd) : null,
      all_in_match: str(trip.allInMatch, 40) || null,
      trip_link: str(trip.link, 2000) || null,
      // crewText is the stop-by-stop brief for the team (builder crew.js); older builders only send the day-by-day itinerary.
      itinerary: str(p.crewText, 20_000) || str(p.itinerary, 20_000) || null,
      notes: str(contact.notes, 2000) || null,
      campaign_ref: str(p.ref, 60) || null,
      from_hostel: str(p.fromHostel, 60) || null,
      payload: p,
      deposit_amount: depositUsd,
    });
    if (!error) ref = candidate;
    else if (!/duplicate|unique/i.test(error.message)) return json({ error: "Couldn't save your trip. Please try again." }, 500);
  }
  if (!ref) return json({ error: "Couldn't save your trip. Please try again." }, 500);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const back = builderStatusUrl(origin, ref);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: DEPOSIT_PER_PERSON_USD * 100,
          product_data: {
            name: "Mad Monkey trip deposit",
            description: `${route.slice(0, 200)} · ${days} days · ref ${ref}. Comes off your trip total; refunded if the crew can't make it work.`,
          },
        },
        quantity: people,
      }],
      success_url: back,
      cancel_url: back,
      metadata: { kind: "trip_builder_deposit", ref, origin: origin ?? "" },
      payment_intent_data: {
        description: `Trip builder deposit · ref ${ref}`,
        metadata: { kind: "trip_builder_deposit", ref },
      },
    });
    await sb.from("trip_builder_requests").update({ deposit_session_id: session.id, deposit_url: session.url, updated_at: new Date().toISOString() }).eq("ref", ref);
    return json({
      ref,
      status: "pending_payment",
      checkoutUrl: session.url,
      deposit: { amount: depositUsd, perPerson: DEPOSIT_PER_PERSON_USD, people },
      hold: start ? { until: new Date(Date.now() + HOLD_HOURS * 3600_000).toISOString() } : null,
    });
  } catch (e) {
    console.error("trip builder checkout failed:", e instanceof Error ? e.message : e);
    return json({ error: "Payment couldn't start." }, 502);
  }
});
