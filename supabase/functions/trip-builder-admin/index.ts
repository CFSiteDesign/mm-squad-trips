// Admin > Trip builder (Charlie, 19 Oct 2026). Gated like squad-admin (admin
// token, or the admin password in the body).
//   list                              every request, newest first
//   checking   {ref, note?}           a crew member has picked it up
//   balance    {ref, amount, note?}   Stripe link for the balance; guest gets "ready" email
//   decline    {ref, note?, refund}   can't make it work; refunds the deposit when refund=true
//   booked     {ref, note?}           paid some other way: mark it done
//   note       {ref, note}            save the crew note only
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { adminAuthHeaderToken, verifyAdminToken } from "../_shared/admin-auth.ts";
import { sendEmail, TRIP_BUILDER_CONTACT, tripBuilderDeclinedEmail, tripBuilderReadyEmail } from "../_shared/email.ts";
import { builderStatusUrl, usd } from "../_shared/trip-builder.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const LIVE_ORIGIN = "https://madmonkeyhostels.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!url || !key || !adminPassword) return json({ error: "Backend not configured" }, 503);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const bearer = adminAuthHeaderToken(req);
  let authed = bearer ? await verifyAdminToken(bearer) : false;
  if (!authed) {
    const pw = typeof body.password === "string" ? body.password.trim() : "";
    authed = !!pw && pw === adminPassword;
  }
  if (!authed) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(url, key);
  const action = typeof body.action === "string" ? body.action : "list";

  if (action === "list") {
    const { data, error } = await sb
      .from("trip_builder_requests")
      .select("ref,status,name,contact_via,email,whatsapp,guest_email,from_place,party_size,dates_flex,start_date,route,days,nights,stops,est_total_usd,all_in_match,trip_link,itinerary,notes,campaign_ref,from_hostel,deposit_amount,deposit_paid_at,hold_until,balance_amount,balance_url,balance_paid_at,refunded_at,crew_note,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, requests: data ?? [] });
  }

  const ref = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";
  const { data: row, error: rErr } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (rErr) return json({ error: rErr.message }, 500);
  if (!row) return json({ error: `No trip ${ref}` }, 404);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 4000) : (row.crew_note ?? "");
  const now = new Date().toISOString();
  const first = String(row.name ?? "").trim().split(/\s+/)[0] || "there";
  const to = (row.guest_email as string | null) || (row.email as string | null);
  const statusUrl = builderStatusUrl(LIVE_ORIGIN, row.ref);
  const save = async (patch: Record<string, unknown>) => {
    const { error } = await sb.from("trip_builder_requests").update({ ...patch, updated_at: now }).eq("ref", ref);
    if (error) throw new Error(error.message);
  };

  try {
    if (action === "note") {
      await save({ crew_note: note || null });
      return json({ ok: true });
    }
    if (action === "checking") {
      if (!row.deposit_paid_at) return json({ error: "The deposit isn't paid yet." }, 400);
      await save({ status: "checking", crew_note: note || null });
      return json({ ok: true });
    }
    if (action === "booked") {
      await save({ status: "approved", crew_note: note || null });
      return json({ ok: true });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 503);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (action === "balance") {
      if (!row.deposit_paid_at) return json({ error: "The deposit isn't paid yet." }, 400);
      if (row.balance_paid_at) return json({ error: "The balance is already paid." }, 400);
      const amount = Math.round(Number(body.amount) * 100) / 100;
      if (!(amount >= 1 && amount <= 50_000)) return json({ error: "Enter the balance in US dollars (after the deposit)." }, 400);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: to || undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: { name: "Mad Monkey trip: balance", description: `${String(row.route ?? "").slice(0, 200)} · ref ${row.ref}` },
          },
          quantity: 1,
        }],
        success_url: statusUrl,
        cancel_url: statusUrl,
        metadata: { kind: "trip_builder_balance", ref: row.ref, origin: LIVE_ORIGIN },
        payment_intent_data: { description: `Trip builder balance · ref ${row.ref}`, metadata: { kind: "trip_builder_balance", ref: row.ref } },
      });
      await save({ status: "ready", balance_amount: amount, balance_session_id: session.id, balance_url: session.url, crew_note: note || null });
      let emailed = false;
      if (to) {
        const m = tripBuilderReadyEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", balance: usd(amount), note, payUrl: session.url ?? statusUrl, statusUrl });
        await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_ready" });
        emailed = true;
      }
      return json({ ok: true, url: session.url, emailed });
    }

    if (action === "decline") {
      let refunded = 0;
      if (body.refund === true && row.deposit_payment_intent && !row.refunded_at) {
        const r = await stripe.refunds.create(
          { payment_intent: row.deposit_payment_intent as string, metadata: { kind: "trip_builder_deposit_refund", ref: row.ref } },
          { idempotencyKey: `trip-builder-refund:${row.ref}` },
        );
        refunded = (r.amount ?? 0) / 100;
        await save({ refund_id: r.id, refunded_at: now });
      }
      await save({ status: "declined", crew_note: note || null });
      if (to) {
        const m = tripBuilderDeclinedEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", note, refunded: refunded ? usd(refunded) : "", statusUrl });
        await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_declined" });
      }
      return json({ ok: true, refunded });
    }

    return json({ error: `Unknown action ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Action failed" }, 500);
  }
});
