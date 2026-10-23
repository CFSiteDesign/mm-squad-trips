// Trip builder: "Hold my beds + get it checked" (Charlie, 19 Oct 2026).
// The builder (public/trip-builder) posts the guest's whole plan here (Ewan's
// lead payload, docs in his repo's docs/LEADS.md).
//
// FREE TO SEND (Ewan, 23 Oct 2026): we save it as "submitted" and email the crew and
// the guest straight away. Nothing is paid until the crew has checked the trip and the
// guest chooses how to pay (trip-builder-pay). No Stripe is involved here.
//
// With the secret TRIP_BUILDER_DEPOSIT_PER_PERSON set (a switch back to the old way) we
// save it as pending_payment and return a Stripe Checkout link for the deposit, charged
// here, never trusted from the browser; stripe-webhook marks it paid
// (_shared/trip-builder.ts). Either way it shows up in Admin > Trip builder.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { depositPerPerson, handleTripBuilderSubmitted, HOLD_HOURS, MAX_PEOPLE } from "../_shared/trip-builder.ts";
import { trustedBase } from "../_shared/app-base.ts";
import { crewSecret, guestTripUrl, signGuestKey } from "../_shared/trip-builder-crew.ts";
import { ownTripLink } from "../_shared/trip-builder-revise.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Who is asking, as a keyed hash: enough to count how many trips one address sends in an hour, and never the address itself. */
async function hashIp(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip")
    || (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop()   // the last one is added by our own gateway; the first can be made up
    || "";
  const secret = crewSecret();
  if (!ip || !secret) return "";
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`tbip:${ip}`)));
  return Array.from(sig.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

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
  const perPerson = depositPerPerson();           // 0 = free to send (the default)
  const free = perPerson === 0;
  if (!url || !key || (!free && !stripeKey)) return json({ error: free ? "Not set up yet." : "Payments aren't set up yet." }, 503);

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
  const depositUsd = perPerson * people;
  const start = typeof trip.start === "string" && DATE.test(trip.start) ? trip.start : null;
  const origin = req.headers.get("origin");
  const sb = createClient(url, key);

  // Anyone on the internet can call this, so keep a runaway script from filling Admin with junk: a few trips an hour from one
  // contact and from one address. (Not a global cap: that would let one script lock every real guest out.)
  const ipHash = await hashIp(req);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const sentRecently = async (col: string, val: string) => {
    const { data } = await sb.from("trip_builder_requests").select("ref").eq(col, val).gte("created_at", since).limit(12);
    return Array.isArray(data) ? data.length : 0;
  };
  if ((await sentRecently(via === "email" ? "email" : "whatsapp", via === "email" ? email : whatsapp)) >= 5 || (ipHash && (await sentRecently("payload->>ipHash", ipHash)) >= 10)) {
    return json({ error: "That's a few trips from you in the last hour. Check your email for the link, or message the crew and we'll sort it out." }, 429);
  }
  // The link goes into emails the crew and the guest open, so it has to lead to our own trip builder (see _shared/app-base.ts).
  const tripLink = ownTripLink(str(trip.link, 2000), new URL(trustedBase(origin)).origin) ? str(trip.link, 2000) : null;
  delete p.ipHash;
  if (ipHash) p.ipHash = ipHash;

  // Free to send: the same guest pressing Send twice, or trying again after a dropped connection (common on a phone abroad), must not put two copies of the trip in front of the
  // crew. The same contact and the same trip within ten minutes is the one already sent: say so, without a second email and WITHOUT the guest key (it is in the first reply and the
  // first email; handing it to whoever repeats a contact and a trip would let a stranger open someone's trip).
  if (free && tripLink) {
    const { data: same } = await sb.from("trip_builder_requests").select("ref,status,hold_until")
      .eq(via === "email" ? "email" : "whatsapp", via === "email" ? email : whatsapp).eq("trip_link", tripLink).in("status", ["submitted", "checking", "ready"])
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
    const dup = Array.isArray(same) ? same[0] : null;
    if (dup) return json({ ref: dup.ref, status: dup.status, duplicate: true, deposit: { amount: 0, perPerson: 0, people }, hold: dup.hold_until ? { until: dup.hold_until } : null });
  }
  // A free trip is with the crew from the start, and starts its bed hold now; a paid deposit starts the hold when it lands (stripe-webhook).
  const holdUntil = free && start ? new Date(Date.now() + HOLD_HOURS * 3600_000).toISOString() : null;
  // Save first, with a fresh reference (retry on the unlikely clash).
  let ref = "", saved: Record<string, unknown> = {};
  for (let i = 0; i < 5 && !ref; i++) {
    const candidate = newRef();
    const record = {
      ref: candidate,
      status: free ? "submitted" : "pending_payment",
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
      trip_link: tripLink,
      // crewText is the stop-by-stop brief for the team (builder crew.js); older builders only send the day-by-day itinerary.
      itinerary: str(p.crewText, 20_000) || str(p.itinerary, 20_000) || null,
      notes: str(contact.notes, 2000) || null,
      campaign_ref: str(p.ref, 60) || null,
      from_hostel: str(p.fromHostel, 60) || null,
      payload: p,
      deposit_amount: depositUsd,
      hold_until: holdUntil,
    };
    const { error } = await sb.from("trip_builder_requests").insert(record);
    if (!error) { ref = candidate; saved = record; }
    else if (!/duplicate|unique/i.test(error.message)) return json({ error: "Couldn't save your trip. Please try again." }, 500);
  }
  if (!ref) return json({ error: "Couldn't save your trip. Please try again." }, 500);

  // Free to send: it's with the crew now. Tell them (and the guest), and hand the guest their key: it's how they change the trip after sending it.
  if (free) {
    await handleTripBuilderSubmitted({ ...saved, guest_email: null, deposit_paid_at: null, balance_paid_at: null, balance_amount: null } as never, origin)
      .catch((e) => console.error("trip builder: new-trip emails failed:", e instanceof Error ? e.message : e));
    return json({ ref, status: "submitted", key: await signGuestKey(ref), deposit: { amount: 0, perPerson: 0, people }, hold: holdUntil ? { until: holdUntil } : null });
  }

  const stripe = new Stripe(stripeKey as string, { apiVersion: "2025-08-27.basil" });
  // The guest's own key goes back to their browser and into their trip page link: it's how they change the trip after sending it.
  const guestKey = await signGuestKey(ref);
  const back = guestTripUrl(origin, ref, guestKey);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: perPerson * 100,
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
      // Save the card with the deposit, so that once the crew has approved the trip the guest can pay the rest
      // on the schedule they choose (now, 7 days before they leave, or in instalments). Same as ALL IN bookings.
      customer_creation: "always",
      custom_text: {
        submit: {
          message: `You're paying a $${depositUsd} deposit today. It comes off your trip total, and you get it back if the crew can't make the trip work. If you approve the checked plan, the rest is charged to this card on the schedule you choose, or you can pay it sooner.`,
        },
      },
      payment_intent_data: {
        description: `Trip builder deposit · ref ${ref}`,
        metadata: { kind: "trip_builder_deposit", ref },
        setup_future_usage: "off_session",
      },
    });
    await sb.from("trip_builder_requests").update({ deposit_session_id: session.id, deposit_url: session.url, updated_at: new Date().toISOString() }).eq("ref", ref);
    return json({
      ref,
      status: "pending_payment",
      checkoutUrl: session.url,
      key: guestKey,
      deposit: { amount: depositUsd, perPerson, people },
      hold: start ? { until: new Date(Date.now() + HOLD_HOURS * 3600_000).toISOString() } : null,
    });
  } catch (e) {
    console.error("trip builder checkout failed:", e instanceof Error ? e.message : e);
    return json({ error: "Payment couldn't start." }, 502);
  }
});
