// Lookup booking details for the confirmation page.
// - Always returns trip/departure/amount from the Stripe session metadata so the
//   page renders even before the webhook has written the Airtable row.
// - Returns bookingRef from Airtable when the Bookings row exists; otherwise
//   bookingRef is null. The client polls until it appears.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { airtableGet } from "../_shared/airtable.ts";

interface BookingFields {
  "Booking Ref"?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") return jr({ error: "sessionId required" }, 400);

    // 1. Always fetch Stripe session so the page can render without Airtable.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jr({ error: "Stripe not configured" }, 503);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const m = (session.metadata ?? {}) as Record<string, string>;
    const amountPaid = (session.amount_total ?? 0) / 100;
    const paymentType = m.payment_type === "deposit" ? "Deposit" : "Full";
    const finalPrice = Number(m.final_price ?? m.full_due ?? 0);
    const balanceDue = paymentType === "Deposit" ? Math.max(0, finalPrice - amountPaid) : 0;

    const sessionInfo = {
      tripName: m.trip_name ?? "",
      departureDate: m.departure_date ?? "",
      amountPaid,
      balanceDue,
      paymentType,
    };

    // 2. Try Airtable for Booking Ref. Don't fail the response if missing.
    let bookingRef: string | null = null;
    try {
      const safe = sessionId.replace(/"/g, "");
      // Sort by Spot Number ascending so the lead row (Spot 1) is always
      // returned first — otherwise a group booking can surface a member's
      // ref on the confirmation page instead of the lead's.
      const rows = await airtableGet<BookingFields>("Bookings", {
        filterByFormula: `{Stripe Session ID} = "${safe}"`,
        "sort[0][field]": "Spot Number",
        "sort[0][direction]": "asc",
        maxRecords: "1",
      });
      const ref = rows[0]?.fields["Booking Ref"];
      if (ref) bookingRef = String(ref);
    } catch (e) {
      console.warn("booking-lookup airtable error", e instanceof Error ? e.message : e);
    }

    return jr({ booking: { ...sessionInfo, bookingRef } });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
