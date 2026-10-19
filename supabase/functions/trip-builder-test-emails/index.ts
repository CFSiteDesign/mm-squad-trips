// Test sends of every trip builder email to Ewan (Charlie, 19 Oct 2026), so he
// sees exactly what he and the guests get. It can only ever email Ewan, the
// content is fixed sample data, and it runs at most once every 5 minutes.
// POST, no body.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  sendEmail,
  TRIP_BUILDER_CONTACT,
  tripBuilderConfirmedEmail,
  tripBuilderDeclinedEmail,
  tripBuilderDepositEmail,
  tripBuilderOpsEmail,
  tripBuilderReadyEmail,
} from "../_shared/email.ts";

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
      ref, name: "Charlie (test)", contact: "WhatsApp +44 7495 794060", guestEmail: "charlieboyy02+tripbuilder-test@gmail.com",
      guestWhatsapp: "+447495794060", people: 2, route, days: 13, startDate: "", dates: "fixed", estTotal: "$612 (builder estimate)",
      deposit: "$100", allInMatch: "cambodia", notes: "Test send: this is what lands in your inbox when a guest pays a deposit.", itinerary,
      tripLink: statusUrl, adminUrl: "https://madmonkeyhostels.com/all-in-trips/admin", holdUntil: "",
    }) },
    { tpl: "trip_builder_test_deposit", m: tripBuilderDepositEmail({
      firstName: "Charlie", ref, route, days: 13, startDate: "", deposit: "$100", people: 2, holdUntil: "", statusUrl,
    }) },
    { tpl: "trip_builder_test_ready", m: tripBuilderReadyEmail({
      firstName: "Charlie", ref, route, balance: "$512",
      note: "All checked. We swapped the Kampot bus for a morning minivan so you arrive in daylight.", payUrl: statusUrl, statusUrl,
    }) },
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
