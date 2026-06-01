// Stripe webhook → Airtable Bookings.
// - Verifies signature (STRIPE_WEBHOOK_SECRET)
// - Handles checkout.session.completed
// - Idempotent: skips if a Booking with the same Stripe Session ID exists
// - Multi-traveler: writes N rows (1 lead + N-1 members) sharing a Group ID
// - Decrements Departure Spots Remaining by N
// - Increments Discount Code Used Count by N (mirrors Squad demo: each
//   traveler counts as 1 toward the code's tally)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { airtableGet, airtableCreateMany, airtablePatch } from "../_shared/airtable.ts";

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
      await writeBookings(session);
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
    return new Response(JSON.stringify({ received: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseTraveler(v: string): Record<string, string> {
  const [name = "", email = "", phone = "", country = "", age = ""] = v.split("|");
  return { name, email, phone, country, age };
}

function makeGroupId(sessionId: string): string {
  const tail = sessionId.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase();
  return `GRP-${tail}`;
}

async function writeBookings(session: Stripe.Checkout.Session) {
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

  const tripId = m.trip_id || (await lookupTripIdBySlug(m.trip_slug ?? ""));
  const departureId = m.departure_id;
  const groupSize = Math.max(1, Number(m.group_size || "1"));
  const paymentType = m.payment_type === "deposit" ? "Deposit" : "Full";
  const amountPaidTotal = (session.amount_total ?? 0) / 100;
  const subtotal = Number(m.subtotal || "0");
  const discountAmount = Number(m.discount_amount || "0");
  const fullDue = Number(m.full_due || String(subtotal - discountAmount));
  const pricePerSpot = Number(m.price_per_spot || "0");
  const perSpotPaid = amountPaidTotal / groupSize;
  const perSpotFinal = fullDue / groupSize;
  const perSpotDiscount = discountAmount / groupSize;

  // Optional discount link
  let discountLink: string[] | undefined;
  let discountRecordId: string | undefined;
  if (m.discount_code) {
    const discounts = await airtableGet<{ "Used Count"?: number }>("Discount Codes", {
      filterByFormula: `UPPER({Code}) = "${m.discount_code.replace(/"/g, "")}"`,
      maxRecords: "1",
    });
    if (discounts.length > 0) {
      discountRecordId = discounts[0].id;
      discountLink = [discountRecordId];
    }
  }

  const groupId = makeGroupId(sessionId);
  const isSolo = groupSize === 1;

  // Build the N rows
  const rows: Record<string, unknown>[] = [];

  // Row 1: lead
  rows.push({
    "Trip": tripId ? [tripId] : undefined,
    "Departure": departureId ? [departureId] : undefined,
    "Booking Type": isSolo ? "Solo" : "Group lead",
    "Group ID": groupId,
    "Group Size": groupSize,
    "Spot Number": 1,
    "Friend Names Mentioned": m.friends_mentioned || undefined,
    "Lead Name": m.lead_name,
    "Lead Email": m.lead_email,
    "Lead Phone": m.lead_phone,
    "Lead Country": m.lead_country || undefined,
    "Lead Age": m.lead_age ? Number(m.lead_age) : undefined,
    "Solo?": m.lead_solo === "true",
    "Source": m.lead_source || undefined,
    "Traveler Name": m.lead_name,
    "Traveler Email": m.lead_email,
    "Traveler Phone": m.lead_phone,
    "Traveler Country": m.lead_country || undefined,
    "Traveler Age": m.lead_age ? Number(m.lead_age) : undefined,
    "Payment Type": paymentType,
    "Original Price": pricePerSpot || subtotal / groupSize,
    "Discount Code": discountLink,
    "Discount Amount": Math.round(perSpotDiscount * 100) / 100,
    "Final Price": Math.round(perSpotFinal * 100) / 100,
    "Amount Paid": Math.round(perSpotPaid * 100) / 100,
    "Status": "Confirmed",
    "Stripe Session ID": sessionId,
    "UTM Source": m.utm_source || undefined,
    "UTM Medium": m.utm_medium || undefined,
    "UTM Campaign": m.utm_campaign || undefined,
    "UTM Content": m.utm_content || undefined,
  });

  // Rows 2..N: additional travelers
  for (let i = 1; i < groupSize; i++) {
    const raw = (m as Record<string, string>)[`traveler_${i}`];
    const t = raw ? parseTraveler(raw) : { name: "", email: "", phone: "", country: "", age: "" };
    rows.push({
      "Trip": tripId ? [tripId] : undefined,
      "Departure": departureId ? [departureId] : undefined,
      "Booking Type": "Group member",
      "Group ID": groupId,
      "Group Size": groupSize,
      "Spot Number": i + 1,
      "Lead Name": m.lead_name,
      "Lead Email": m.lead_email,
      "Traveler Name": t.name || undefined,
      "Traveler Email": t.email || undefined,
      "Traveler Phone": t.phone || undefined,
      "Traveler Country": t.country || undefined,
      "Traveler Age": t.age ? Number(t.age) : undefined,
      "Payment Type": paymentType,
      "Original Price": pricePerSpot || subtotal / groupSize,
      "Discount Code": discountLink,
      "Discount Amount": Math.round(perSpotDiscount * 100) / 100,
      "Final Price": Math.round(perSpotFinal * 100) / 100,
      "Amount Paid": Math.round(perSpotPaid * 100) / 100,
      "Status": "Confirmed",
      "Stripe Session ID": sessionId,
    });
  }

  // Strip undefineds
  for (const row of rows) {
    for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  }

  const created = await airtableCreateMany("Bookings", rows);
  console.log(`Created ${created.length} booking row(s) for ${sessionId} group ${groupId}`);

  // Decrement Departure Spots Remaining by N
  if (departureId) {
    try {
      const deps = await airtableGet<{ "Spots Remaining"?: number; "Total Spots"?: number }>(
        "Departures",
        { filterByFormula: `RECORD_ID() = "${departureId.replace(/"/g, "")}"`, maxRecords: "1" },
      );
      if (deps.length > 0) {
        const current = deps[0].fields["Spots Remaining"] ?? deps[0].fields["Total Spots"] ?? 0;
        const next = Math.max(0, current - groupSize);
        await airtablePatch("Departures", departureId, { "Spots Remaining": next });
        console.log(`Decremented Departure ${departureId} spots ${current} → ${next}`);
      }
    } catch (e) {
      console.error("Failed to decrement spots:", e instanceof Error ? e.message : String(e));
    }
  }

  // Bump Discount Code Used Count by N (Squad-demo logic: each traveler = 1)
  if (discountRecordId) {
    try {
      const codes = await airtableGet<{ "Used Count"?: number }>("Discount Codes", {
        filterByFormula: `RECORD_ID() = "${discountRecordId}"`,
        maxRecords: "1",
      });
      const used = codes[0]?.fields["Used Count"] ?? 0;
      await airtablePatch("Discount Codes", discountRecordId, {
        "Used Count": used + groupSize,
      });
      console.log(`Bumped discount ${m.discount_code} used ${used} → ${used + groupSize}`);
    } catch (e) {
      console.error("Failed to bump discount usage:", e instanceof Error ? e.message : String(e));
    }
  }
}

async function lookupTripIdBySlug(slug: string): Promise<string | undefined> {
  if (!slug) return undefined;
  const rows = await airtableGet("Trips", {
    filterByFormula: `{URL Slug} = "${slug.replace(/"/g, "")}"`,
    maxRecords: "1",
  });
  return rows[0]?.id;
}
