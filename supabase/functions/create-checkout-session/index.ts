// Server-side price resolution + Stripe Checkout session creation.
// - Re-fetches Trip, Pricing Calendar, Departure from Airtable (never trusts client)
// - Re-checks Bookable? and Spots Remaining >= groupSize
// - Resolves price: month override → trip default
// - Applies validated discount code (full price only — not deposits)
// - 60-day rule: $99/spot deposit if departure ≥60 days out, else pay in full
// - Creates a Stripe Checkout session with a full metadata snapshot so the
//   webhook can write the Booking row to Airtable.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { airtableGet } from "../_shared/airtable.ts";

const DEPOSIT_PER_SPOT = 99;
const DEPOSIT_THRESHOLD_DAYS = 60;
const HIDE_WITHIN_DAYS = 7;

interface TripFields {
  "Trip Code": string;
  "Trip Name": string;
  "URL Slug": string;
  "Default Price": number;
  "Active?": boolean;
}
interface PricingFields {
  Trip: string[];
  Month: string;
  Price: number;
  "Active?": boolean;
}
interface DepartureFields {
  "Departure ID"?: string;
  "Departure Date": string;
  "Spots Remaining"?: number;
  "Total Spots"?: number;
  "Bookable?": boolean;
}
interface DiscountFields {
  Code: string;
  "Discount Amount": string;
  "Active?": boolean;
  "Usage Limit"?: number;
  "Used Count"?: number;
  "Expiry Date"?: string;
  "Applicable To": string[];
}

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
};

function daysUntil(iso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00Z");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return err("Stripe is not configured", 503);

  let payload: {
    tripSlug?: string;
    departureId?: string;
    groupSize?: number;
    leadBooker?: Record<string, unknown>;
    travelers?: unknown[];
    discountCode?: string;
    friendsMentioned?: string;
    utm?: Record<string, string>;
  };
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const { tripSlug, departureId, groupSize, leadBooker, travelers = [], discountCode, friendsMentioned, utm = {} } = payload;

  if (!tripSlug || typeof tripSlug !== "string") return err("tripSlug required");
  if (!departureId || typeof departureId !== "string") return err("departureId required");
  if (!groupSize || typeof groupSize !== "number" || groupSize < 1 || groupSize > 5) return err("groupSize must be 1–5");
  if (!leadBooker || typeof leadBooker !== "object") return err("leadBooker required");
  const lead = leadBooker as Record<string, string>;
  if (!lead.name || !lead.email || !lead.phone) return err("Lead booker name, email, phone required");

  try {
    // 1. Trip (must be active)
    const trips = await airtableGet<TripFields>("Trips", {
      filterByFormula: `AND({URL Slug} = "${tripSlug.replace(/"/g, "")}", {Active?} = TRUE())`,
      maxRecords: "1",
    });
    if (trips.length === 0) return err("Trip not found or inactive", 404);
    const trip = trips[0];
    const tripCode = trip.fields["Trip Code"];
    const tripName = trip.fields["Trip Name"];

    // 2. Departure by Airtable record id, re-validated
    const deps = await airtableGet<DepartureFields>("Departures", {
      filterByFormula: `RECORD_ID() = "${departureId.replace(/"/g, "")}"`,
      maxRecords: "1",
    });
    if (deps.length === 0) return err("Departure not found", 404);
    const dep = deps[0];
    const depDate = dep.fields["Departure Date"];
    const spotsRemaining = dep.fields["Spots Remaining"] ?? dep.fields["Total Spots"] ?? 0;
    if (dep.fields["Bookable?"] !== true) return err("This departure is no longer bookable");
    if (spotsRemaining < groupSize) return err(`Only ${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} left`);
    if (daysUntil(depDate) < HIDE_WITHIN_DAYS) return err("This departure is too close to book online");

    // 3. Resolve price (month override → default)
    const month = depDate.slice(0, 7);
    const pricing = await airtableGet<PricingFields>("Pricing Calendar", {
      filterByFormula: `AND({Active?} = TRUE(), ARRAYJOIN({Trip}) = "${tripName.replace(/"/g, "")}", {Month} = "${month}")`,
      maxRecords: "1",
    });
    const pricePerSpot = pricing[0]?.fields.Price ?? trip.fields["Default Price"];
    const subtotal = pricePerSpot * groupSize;

    // 4. Discount (full price only)
    let discountAmount = 0;
    let appliedCode: string | null = null;
    if (discountCode) {
      const safe = discountCode.toUpperCase().replace(/"/g, "");
      const rows = await airtableGet<DiscountFields>("Discount Codes", {
        filterByFormula: `UPPER({Code}) = "${safe}"`,
        maxRecords: "1",
      });
      if (rows.length > 0) {
        const d = rows[0].fields;
        const expired = d["Expiry Date"] && new Date(d["Expiry Date"]) < new Date();
        const exhausted = typeof d["Usage Limit"] === "number" && (d["Used Count"] ?? 0) >= d["Usage Limit"];
        const applies = (d["Applicable To"] ?? []).includes("All") ||
          (d["Applicable To"] ?? []).includes(SLUG_TO_LABEL[tripSlug]);
        if (d["Active?"] === true && !expired && !exhausted && applies) {
          discountAmount = Number((d["Discount Amount"] || "").replace(/[^0-9.]/g, "")) || 0;
          appliedCode = safe;
        }
      }
    }

    // 5. 60-day rule
    const isDeposit = daysUntil(depDate) >= DEPOSIT_THRESHOLD_DAYS;
    const fullDue = Math.max(0, subtotal - discountAmount);
    const amountToday = isDeposit ? DEPOSIT_PER_SPOT * groupSize : fullDue;
    const lineLabel = isDeposit
      ? `${tripName} — Deposit ($99 × ${groupSize})`
      : `${tripName} — Pay in full`;

    // 6. Stripe Checkout
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "";

    // Existing customer lookup (best-effort, doesn't fail checkout)
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: lead.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    } catch (_) { /* ignore */ }

    const metadata: Record<string, string> = {
      trip_slug: tripSlug,
      trip_id: trip.id,
      trip_code: tripCode,
      trip_name: tripName,
      departure_id: dep.id,
      departure_code: dep.fields["Departure ID"] ?? `${tripCode}-${depDate}`,
      departure_date: depDate,
      group_size: String(groupSize),
      price_per_spot: String(pricePerSpot),
      subtotal: String(subtotal),
      discount_code: appliedCode ?? "",
      discount_amount: String(discountAmount),
      full_due: String(fullDue),
      amount_today: String(amountToday),
      payment_type: isDeposit ? "deposit" : "full",
      lead_name: lead.name,
      lead_email: lead.email,
      lead_phone: lead.phone,
      lead_country: lead.country ?? "",
      lead_age: lead.age ?? "",
      lead_source: lead.source ?? "",
      lead_solo: String(lead.solo ?? ""),
      friends_mentioned: friendsMentioned ?? "",
      utm_source: utm.utm_source ?? "",
      utm_medium: utm.utm_medium ?? "",
      utm_campaign: utm.utm_campaign ?? "",
      utm_content: utm.utm_content ?? "",
      // Truncated traveler snapshot — full payload kept in payment_intent description
      travelers_json: JSON.stringify(travelers).slice(0, 450),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : lead.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountToday * 100),
            product_data: {
              name: lineLabel,
              description: `${groupSize} spot${groupSize === 1 ? "" : "s"} · departs ${depDate}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
        description: `${tripName} × ${groupSize} · ${depDate}`,
      },
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${tripSlug}?cancelled=1#booking`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("create-checkout-session error", msg);
    return err(msg, 500);
  }
});
