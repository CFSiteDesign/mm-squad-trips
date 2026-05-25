// Server-side price resolution + Stripe Checkout session creation.
// STRIPE NOT YET CONFIGURED — returns a clear error so the frontend booking flow
// surfaces a friendly message until STRIPE_SECRET_KEY is added.
// When Stripe is enabled, this function will:
//   1. Re-lookup Trip, Pricing Calendar, Departure
//   2. Re-check Bookable? and Spots Remaining >= groupSize
//   3. Resolve price (month override → default), apply discount, × groupSize
//   4. Apply 60-day rule → deposit ($99×groupSize) vs full
//   5. Create Stripe Checkout session with metadata snapshot (so webhook can write Booking)
//   6. Return { url }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(
      JSON.stringify({
        error:
          "Payments aren't switched on yet for this pilot. Add STRIPE_SECRET_KEY to enable checkout.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  // TODO: wire Stripe Checkout once the secret lands.
  return new Response(
    JSON.stringify({ error: "Stripe integration scaffolded — pending implementation." }),
    { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
