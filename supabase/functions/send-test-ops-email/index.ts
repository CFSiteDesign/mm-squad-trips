// One-off test email to the ops team + GMs so everyone can see the
// standard "trip confirmed" ops notification format.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  OPS_NOTIFY_EMAILS,
  TRIP_OPS_CC,
  sendEmail,
} from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // CC every GM across all regions + Lexie + Cai (Cai/Lexie already in OPS list, dedupe)
  const gmCc = Array.from(new Set(TRIP_OPS_CC.map((r) => r.email)));
  const extraCc = ["lexie@madmonkeyhostels.com", "cai@madmonkeyhostels.com"];
  const cc = Array.from(new Set([...gmCc, ...extraCc])).filter(
    (e) => !OPS_NOTIFY_EMAILS.includes(e),
  );

  const subject =
    "[TEST — PLEASE IGNORE] Example ops notification — All In trip booking";

  const html = `
<div style="font-family:Montserrat,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0a0a0a">
  <div style="background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:10px 14px;border:2px solid #0a0a0a;letter-spacing:.02em">
    ⚠️ This is a TEST email — no action required
  </div>
  <h1 style="font-size:22px;text-transform:uppercase;font-weight:900;margin:24px 0 8px">
    Example ops notification
  </h1>
  <p style="margin:0 0 16px;line-height:1.5">
    Hey team — sending this so everyone can see what the automated ops
    notification looks like when a booking comes in / a departure hits its
    5-traveller minimum on the All In squad trips platform.
  </p>
  <p style="margin:0 0 16px;line-height:1.5">
    Going forward, you'll receive real versions of these whenever:
  </p>
  <ul style="margin:0 0 16px 20px;line-height:1.6">
    <li>A new booking is made (with lead name, spots, squad code, amount)</li>
    <li>A departure officially confirms (hits 5 travellers)</li>
    <li>A departure is auto-cancelled + refunded (didn't hit minimum 30 days out)</li>
  </ul>
  <p style="margin:0 0 16px;line-height:1.5">
    <strong>Region GMs</strong> are CC'd on the relevant trip only —
    e.g. Vietnam GMs on Vietnam bookings, Indo GMs on Indo bookings.
    On this test, every GM is CC'd so you all see the format once.
  </p>
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0">
  <p style="margin:0;font-size:12px;color:#555">
    Questions / replies → cs@madmonkeyhostels.com
  </p>
</div>`;

  try {
    await sendEmail({ to: OPS_NOTIFY_EMAILS, cc, subject, html });
    return new Response(
      JSON.stringify({ ok: true, to: OPS_NOTIFY_EMAILS, cc }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
