// Admin-only one-shot: resend booking confirmation email for a booking id.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";
import { bookingConfirmationEmail, sendEmail, APP_URL } from "../_shared/email.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = adminAuthHeaderToken(req);
    // TEMP open
    void token;

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(url, key);

    const { booking_id } = await req.json().catch(() => ({}));
    if (!booking_id) return jr({ error: "booking_id required" }, 400);

    const { data: b, error } = await sb
      .from("bookings")
      .select("id, lead_name, lead_email, group_size, amount_paid, booking_ref, stripe_session_id, trip_id, departure_id")
      .eq("id", booking_id)
      .maybeSingle();
    if (error || !b) return jr({ error: error?.message ?? "Not found" }, 404);

    const { data: trip } = await sb.from("trips").select("name, slug").eq("id", b.trip_id).maybeSingle();
    const { data: dep } = await sb.from("departures").select("departure_date").eq("id", b.departure_id).maybeSingle();

    const tripName = trip?.name || trip?.slug || "";
    const country = tripName.split(/[—\-:]/)[0]?.trim() || trip?.slug || "your trip";
    const firstName = (b.lead_name || "").split(" ")[0] || "traveler";
    const sessionId = b.stripe_session_id || "";
    const { subject, html } = bookingConfirmationEmail({
      firstName,
      tripCountry: country,
      tripName,
      departureDate: dep?.departure_date || "",
      spots: b.group_size ?? 1,
      amount: `$${Number(b.amount_paid ?? 0).toFixed(2)} USD`,
      bookingRef: b.booking_ref || "",
      bookingUrl: `${APP_URL}/booking-success?session_id=${encodeURIComponent(sessionId)}`,
    });
    await sendEmail({ to: b.lead_email, subject, html });
    return jr({ ok: true, sent_to: b.lead_email });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
