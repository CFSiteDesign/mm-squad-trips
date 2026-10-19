// Test sends of every trip builder email to Ewan (Charlie, 19 Oct 2026), so he
// sees exactly what he and the guests get. It can only ever email Ewan, the
// content is fixed sample data, and it runs at most once every 5 minutes.
// POST, no body.
//
// The new-trip email's Approve / Not approved / Edit it buttons open the crew
// review page for a real (but sample) request, MM-SAMPLE, which this function
// creates or resets each time. It shows up in Admin > Trip builder as "Charlie
// (sample)". Approving it sends the sample guest, who is Ewan, a real payment
// link; just don't pay it. Declining it clears it from the To do list.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  sendEmail,
  TRIP_BUILDER_CONTACT,
  tripBuilderBookedEmail,
  tripBuilderConfirmedEmail,
  tripBuilderDeclinedEmail,
  tripBuilderDepositEmail,
  tripBuilderOpsEmail,
  tripBuilderPaymentFailedEmail,
  tripBuilderReadyEmail,
  tripBuilderReceiptEmail,
  tripBuilderReminderEmail,
} from "../_shared/email.ts";
import { crewReviewUrl, guestTripUrl, readSummary, signCrewKey, signGuestKey, suggestBalance } from "../_shared/trip-builder-crew.ts";
import { SAMPLE_TRIP } from "../_shared/trip-builder-sample.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count } = await sb.from("email_send_log").select("id", { count: "exact", head: true })
    .like("template_name", "trip_builder_test%").gte("created_at", since);
  if ((count ?? 0) > 0) return json({ error: "Test emails went out in the last 5 minutes. Try again shortly." }, 429);

  const ref = "MM-DDYYVA";
  // A real sample request, so the buttons in the new-trip email open something that works. Reset every time.
  const SAMPLE_REF = "MM-SAMPLE";
  const nowIso = new Date().toISOString();
  const SAMPLE = {
    ref: SAMPLE_REF, status: "submitted", name: "Charlie (sample)", contact_via: "email", email: TRIP_BUILDER_CONTACT, whatsapp: null, guest_email: TRIP_BUILDER_CONTACT,
    from_place: "Leeds", party_size: 2, dates_flex: "flex", start_date: null, route: SAMPLE_TRIP.route, days: SAMPLE_TRIP.days, nights: SAMPLE_TRIP.nights,
    stops: [...SAMPLE_TRIP.stops], countries: [...SAMPLE_TRIP.countries], est_total_usd: SAMPLE_TRIP.est, all_in_match: "cambodia",
    trip_link: `https://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/${SAMPLE_TRIP.state}`, itinerary: SAMPLE_TRIP.crewText,
    notes: "This is a sample trip so you can try the Approve, Not approved and Edit it buttons. Nothing here is a real booking.",
    deposit_amount: 100, deposit_paid_at: nowIso, deposit_payment_intent: null, deposit_session_id: null, deposit_url: null, hold_until: null,
    balance_amount: null, balance_session_id: null, balance_url: null, balance_payment_intent: null, balance_paid_at: null, refund_id: null, refunded_at: null,
    crew_note: null, updated_at: nowIso,
    payload: { v: 1, source: "trip-builder-sample", summary: SAMPLE_TRIP.summary, crewText: SAMPLE_TRIP.crewText },
  };
  const { error: sampleErr } = await sb.from("trip_builder_requests").upsert(SAMPLE, { onConflict: "ref" });
  if (sampleErr) return json({ error: `Couldn't set up the sample trip: ${sampleErr.message}` }, 500);
  const sampleSummary = readSummary(SAMPLE.payload);
  const sampleKey = await signCrewKey(SAMPLE_REF);
  const route = "Phnom Penh → Koh Sdach → Koh Rong → Kampot";
  const statusUrl = `https://madmonkeyhostels.com/all-in-trips/trip-builder/#/trip/${ref}`;
  const itinerary = [
    "MY MAD MONKEY TRIP",
    `${route} · 13 days`,
    "",
    "Phnom Penh · 2 nights",
    "Koh Sdach · 3 nights",
    "Koh Rong · 4 nights",
    "Kampot · 3 nights",
    "",
    "(Sample trip for the test send)",
  ].join("\n");
  const emails = [
    { tpl: "trip_builder_test_ops", m: tripBuilderOpsEmail({
      ref: SAMPLE_REF, name: "Charlie (sample)", contact: `Email ${TRIP_BUILDER_CONTACT}`, guestEmail: TRIP_BUILDER_CONTACT,
      guestWhatsapp: "", people: 2, route: SAMPLE_TRIP.route, days: SAMPLE_TRIP.days, startDate: "", dates: "flex", estTotal: `$${SAMPLE_TRIP.est} (builder estimate)`,
      deposit: "$100", allInMatch: "cambodia", notes: SAMPLE.notes, itinerary: SAMPLE_TRIP.crewText,
      tripLink: SAMPLE.trip_link, adminUrl: "https://madmonkeyhostels.com/all-in-trips/admin", holdUntil: "",
      summary: sampleSummary, reviewUrl: crewReviewUrl(null, SAMPLE_REF, sampleKey), approveUrl: crewReviewUrl(null, SAMPLE_REF, sampleKey, "approve"),
      declineUrl: crewReviewUrl(null, SAMPLE_REF, sampleKey, "decline"), editUrl: crewReviewUrl(null, SAMPLE_REF, sampleKey, "edit"),
      suggestedBalance: `$${suggestBalance(sampleSummary, 100)}`,
    }) },
    { tpl: "trip_builder_test_deposit", m: tripBuilderDepositEmail({
      firstName: "Charlie", ref, route, days: 13, startDate: "", deposit: "$100", people: 2, holdUntil: "", statusUrl,
    }) },
    { tpl: "trip_builder_test_ready", m: tripBuilderReadyEmail({
      firstName: "Charlie", ref, route, balance: "$512",
      note: "All checked. We swapped the Kampot bus for a morning minivan so you arrive in daylight.", payUrl: guestTripUrl(null, SAMPLE_REF, await signGuestKey(SAMPLE_REF)), statusUrl,
      planUrl: SAMPLE.trip_link, choices: ["Pay all $512 now", "Pay $512 automatically on Mon 4 Jan, 7 days before you leave", "Pay in 3 instalments of about $171: the first now, then one every 30 days"],
    }) },
    { tpl: "trip_builder_test_booked", m: tripBuilderBookedEmail({
      firstName: "Charlie", ref, route, planLabel: "pay the rest in instalments", deposit: "$100", statusUrl, startDate: "Mon 11 Jan 2027",
      schedule: [{ amount: "$171", due: "Today", paid: true }, { amount: "$171", due: "Wed 18 Nov", paid: false }, { amount: "$170", due: "Fri 18 Dec", paid: false }],
    }) },
    { tpl: "trip_builder_test_reminder", m: tripBuilderReminderEmail({ firstName: "Charlie", ref, route, amount: "$171", due: "Wed 18 Nov", statusUrl }) },
    { tpl: "trip_builder_test_receipt", m: tripBuilderReceiptEmail({ firstName: "Charlie", ref, route, amount: "$171", remaining: "$170", nextDue: "Fri 18 Dec", nextAmount: "$170", statusUrl }) },
    { tpl: "trip_builder_test_payment_failed", m: tripBuilderPaymentFailedEmail({ firstName: "Charlie", ref, route, amount: "$171", nextTry: "Fri 20 Nov", final: false, statusUrl }) },
    { tpl: "trip_builder_test_confirmed", m: tripBuilderConfirmedEmail({ firstName: "Charlie", ref, route, paid: "$512", statusUrl }) },
    { tpl: "trip_builder_test_declined", m: tripBuilderDeclinedEmail({
      firstName: "Charlie", ref, route, note: "Koh Sdach is full on those nights. Want to swap it for Koh Rong Samloem?", refunded: "$100", statusUrl,
    }) },
  ];
  const sent: string[] = [];
  for (const e of emails) {
    const subject = `[TEST] ${e.m.subject}`;
    await sendEmail({ to: TRIP_BUILDER_CONTACT, subject, html: e.m.html, templateName: e.tpl });
    sent.push(subject);
  }
  return json({ ok: true, to: TRIP_BUILDER_CONTACT, sent });
});
