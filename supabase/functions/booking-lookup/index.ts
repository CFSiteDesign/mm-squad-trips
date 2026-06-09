// Lookup booking details for the confirmation page.
// - Returns trip/departure/amount from the Stripe session metadata so the
//   page renders even before the webhook has written the booking row.
// - Returns booking ref (short id) from Postgres when present; otherwise null.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") return jr({ error: "sessionId required" }, 400);

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

    let bookingRef: string | null = null;
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        const sb = createClient(url, key);
        const { data } = await sb
          .from("bookings")
          .select("id, booking_ref, group_id")
          .eq("stripe_session_id", sessionId)
          .order("spot_number", { ascending: true })
          .limit(1);
        if (data && data[0]) {
          const row = data[0] as { id: string; booking_ref: string | null; group_id: string | null };
          bookingRef = row.booking_ref ?? row.group_id ?? String(row.id).slice(0, 8).toUpperCase();
        }
      }
    } catch (e) {
      console.warn("booking-lookup db error", e instanceof Error ? e.message : e);
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
