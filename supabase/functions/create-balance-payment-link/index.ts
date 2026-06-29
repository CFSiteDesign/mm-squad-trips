// Mints a Stripe Checkout session for the outstanding balance of a booking group.
// Called from the "Trip Confirmed" email button and from any "pay balance now" UI.
// Public endpoint — guests follow the link from email, no auth required. We
// validate by booking_ref + lead_email so it can't be brute-forced.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL } from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !sbUrl || !sbKey) {
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { bookingRef?: string; leadEmail?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bookingRef = (body.bookingRef ?? "").trim();
  const leadEmail = (body.leadEmail ?? "").trim().toLowerCase();
  if (!bookingRef || !leadEmail) {
    return new Response(JSON.stringify({ error: "bookingRef and leadEmail required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(sbUrl, sbKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Find the lead row
  const { data: lead, error } = await sb
    .from("bookings")
    .select(
      "id,stripe_session_id,stripe_customer_id,balance_amount,balance_status,group_size,lead_email,lead_name,trip_id,departure_id,booking_ref,trip_slug,trip_name,departures(departure_date)",
    )
    .eq("booking_ref", bookingRef)
    .eq("spot_number", 1)
    .maybeSingle();

  if (error || !lead) {
    return new Response(JSON.stringify({ error: "booking not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (((lead.lead_email as string) || "").toLowerCase() !== leadEmail) {
    return new Response(JSON.stringify({ error: "email mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (lead.balance_status === "charged") {
    return new Response(JSON.stringify({ error: "already paid", alreadyPaid: true }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const totalCents = Math.round(Number(lead.balance_amount) * Number(lead.group_size) * 100);
  if (totalCents <= 0) {
    return new Response(JSON.stringify({ error: "no balance due" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tripName = (lead.trip_name as string) || (lead.trip_slug as string) || "Your trip";
  const origin = req.headers.get("origin") || APP_URL;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: (lead.stripe_customer_id as string) || undefined,
    customer_email: (lead.stripe_customer_id as string) ? undefined : (lead.lead_email as string),
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: totalCents,
          product_data: {
            name: `${tripName} — final balance`,
            description: `${lead.group_size} spot${Number(lead.group_size) === 1 ? "" : "s"} · ref ${bookingRef}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/booking-success?session_id=${encodeURIComponent(lead.stripe_session_id as string)}&balance=paid`,
    cancel_url: `${origin}/booking-success?session_id=${encodeURIComponent(lead.stripe_session_id as string)}`,
    metadata: {
      kind: "balance",
      booking_ref: bookingRef,
      original_session_id: lead.stripe_session_id as string,
      trip_id: String(lead.trip_id ?? ""),
      departure_id: String(lead.departure_id ?? ""),
    },
    payment_intent_data: {
      description: `Trip balance · ref ${bookingRef}`,
      metadata: {
        kind: "balance",
        booking_ref: bookingRef,
        original_session_id: lead.stripe_session_id as string,
      },
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
