// Stripe webhook → Airtable Bookings.
// - Verifies signature (STRIPE_WEBHOOK_SECRET)
// - Handles checkout.session.completed
// - Idempotent: skips if a Booking with the same Stripe Session ID exists
// - Writes one Booking row using metadata snapshot from create-checkout-session
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { airtableGet, airtableCreate } from "../_shared/airtable.ts";

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("webhook not configured", { status: 503, headers: corsHeaders });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400, headers: corsHeaders });

  const raw = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Signature verification failed:", msg);
    return new Response(`Bad signature: ${msg}`, { status: 400, headers: corsHeaders });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await writeBooking(session);
    } else {
      console.log("Ignoring event type:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Webhook handler error:", msg);
    // Return 200 to avoid Stripe retries on Airtable-side data errors; logs will surface it.
    return new Response(JSON.stringify({ received: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function writeBooking(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const sessionId = session.id;

  // Idempotency check
  const existing = await airtableGet("Bookings", {
    filterByFormula: `{Stripe Session ID} = "${sessionId.replace(/"/g, "")}"`,
    maxRecords: "1",
  });
  if (existing.length > 0) {
    console.log("Booking already exists for", sessionId);
    return;
  }

  const tripSlug = m.trip_slug ?? "";
  const tripId = m.trip_id || (await lookupTripIdBySlug(tripSlug));
  const departureId = m.departure_id;
  const groupSize = Number(m.group_size || "1");
  const paymentType = m.payment_type === "deposit" ? "Deposit" : "Full";
  const amountPaid = (session.amount_total ?? 0) / 100;
  const subtotal = Number(m.subtotal || "0");
  const discountAmount = Number(m.discount_amount || "0");
  const fullDue = Number(m.full_due || String(subtotal - discountAmount));

  // Optional discount link
  let discountLink: string[] | undefined;
  if (m.discount_code) {
    const discounts = await airtableGet("Discount Codes", {
      filterByFormula: `UPPER({Code}) = "${m.discount_code.replace(/"/g, "")}"`,
      maxRecords: "1",
    });
    if (discounts.length > 0) discountLink = [discounts[0].id];
  }

  const bookingType = groupSize === 1 ? "Solo" : "Group lead";

  const fields: Record<string, unknown> = {
    "Trip": tripId ? [tripId] : undefined,
    "Departure": departureId ? [departureId] : undefined,
    "Booking Type": bookingType,
    "Group Size": groupSize,
    "Friend Names Mentioned": m.friends_mentioned || undefined,
    "Lead Name": m.lead_name,
    "Lead Email": m.lead_email,
    "Lead Phone": m.lead_phone,
    "Lead Country": m.lead_country || undefined,
    "Lead Age": m.lead_age ? Number(m.lead_age) : undefined,
    "Solo?": m.lead_solo === "true",
    "Source": m.lead_source || undefined,
    "Additional Travelers": m.travelers_json || undefined,
    "Payment Type": paymentType,
    "Original Price": subtotal,
    "Discount Code": discountLink,
    "Discount Amount": discountAmount,
    "Final Price": fullDue,
    "Amount Paid": amountPaid,
    "Status": "Confirmed",
    "Stripe Session ID": sessionId,
    "UTM Source": m.utm_source || undefined,
    "UTM Medium": m.utm_medium || undefined,
    "UTM Campaign": m.utm_campaign || undefined,
    "UTM Content": m.utm_content || undefined,
  };

  // Strip undefined so Airtable doesn't complain about unknown fields
  for (const k of Object.keys(fields)) {
    if (fields[k] === undefined) delete fields[k];
  }

  const created = await airtableCreate("Bookings", fields);
  console.log("Booking created:", created.id, "for", sessionId, `(${SLUG_TO_LABEL[tripSlug] ?? tripSlug})`);
}

async function lookupTripIdBySlug(slug: string): Promise<string | undefined> {
  if (!slug) return undefined;
  const rows = await airtableGet("Trips", {
    filterByFormula: `{URL Slug} = "${slug.replace(/"/g, "")}"`,
    maxRecords: "1",
  });
  return rows[0]?.id;
}
