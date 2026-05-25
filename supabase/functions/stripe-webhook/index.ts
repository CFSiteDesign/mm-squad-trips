// Stripe webhook receiver — scaffold only.
// Will: verify signature, idempotent upsert by Stripe session ID, write Booking(s)
// to Airtable, fire Resend confirmation email. Pending STRIPE_WEBHOOK_SECRET.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return new Response("webhook not configured", { status: 503, headers: corsHeaders });
  }
  // TODO: verify signature, parse checkout.session.completed, write to Airtable, email.
  return new Response("ok", { status: 200, headers: corsHeaders });
});
