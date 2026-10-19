// Daily job: take the trip builder payments that are due, and send the reminders (Ewan, 20 Oct 2026).
// For every booked trip whose guest chose "pay a week before I leave" or instalments:
//   - 3 days before a card payment is due: a reminder email (once)
//   - on the day: charge the card the deposit was paid with, off session (same as ALL IN balances)
//       paid     -> receipt email (or "paid in full")
//       declined -> email the guest a link to pay it by hand, tell Ewan, retry in RETRY_DAYS days, up to MAX_ATTEMPTS times
//   - never after the departure date: it is marked gave_up and Ewan is told
// Guarded by the cron secret, like charge-trip-balances. Rules live in _shared/trip-builder-pay.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  sendEmail,
  TRIP_BUILDER_CONTACT,
  tripBuilderPaymentFailedEmail,
  tripBuilderReceiptEmail,
  tripBuilderReminderEmail,
} from "../_shared/email.ts";
import { guestTripUrl, signGuestKey } from "../_shared/trip-builder-crew.ts";
import { addDays, allPaid, dueNow, isoDay, type Item, MAX_ATTEMPTS, needReminder, paidSoFar, RETRY_DAYS, readSchedule } from "../_shared/trip-builder-pay.ts";
import { fmtDay, teamCc, usd } from "../_shared/trip-builder.ts";

const LIVE_ORIGIN = "https://madmonkeyhostels.com";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const normalize = (v: string | null) => { const t = v?.trim() ?? ""; return /^[0-9a-fA-F]{64}$/.test(t) ? t.toLowerCase() : t; };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY"), sbUrl = Deno.env.get("SUPABASE_URL"), sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !sbUrl || !sbKey) return new Response("not configured", { status: 503, headers: corsHeaders });
  const sb = createClient(sbUrl, sbKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // Shared-secret guard, the same one charge-trip-balances uses.
  const { data: vault, error: vErr } = await sb.rpc("get_cron_secret");
  if (vErr) return new Response("cron secret unavailable", { status: 503, headers: corsHeaders });
  const want = normalize(typeof vault === "string" ? vault : null);
  if (!want || normalize(req.headers.get("x-cron-secret")) !== want) return new Response("forbidden", { status: 403, headers: corsHeaders });

  const now = new Date(), today = isoDay(now), results: Record<string, unknown>[] = [];
  const { data: rows, error } = await sb.from("trip_builder_requests").select("*").eq("status", "approved").in("pay_plan", ["later", "instalments"]).is("balance_paid_at", null);
  if (error) return json({ error: error.message }, 500);

  for (const row of rows ?? []) {
    const items: Item[] = readSchedule(row.pay_schedule);
    const ref = String(row.ref), first = String(row.name ?? "").trim().split(/\s+/)[0] || "there";
    const to = (row.guest_email as string | null) || (row.email as string | null);
    const route = String(row.route ?? "your trip");
    const statusUrl = guestTripUrl(LIVE_ORIGIN, ref, await signGuestKey(ref));
    const upcoming = () => items.filter((i) => i.status === "pending").sort((a, b) => a.due.localeCompare(b.due))[0];
    const alertEwan = (subject: string, html: string, tpl: string) => sendEmail({ to: TRIP_BUILDER_CONTACT, cc: teamCc(), subject, html, templateName: tpl }).catch((e) => console.warn(`${tpl} email failed`, e));
    let changed = false;

    // 1. reminders, 3 days ahead, once each
    for (const it of needReminder(items, 3, now)) {
      if (to) {
        const m = tripBuilderReminderEmail({ firstName: first, ref, route, amount: usd(it.amount), due: fmtDay(it.due), statusUrl });
        await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_reminder" }).catch((e) => console.warn("reminder email failed", e));
      }
      it.reminded = true; changed = true; results.push({ ref, n: it.n, reminded: true });
    }

    // 2. charges that are due
    for (const it of dueNow(items, now)) {
      const give = async (why: string) => {
        it.status = "gave_up"; it.last_error = why; it.retry_after = null; changed = true;
        await alertEwan(`Trip builder: couldn't take ${usd(it.amount)} from ${row.name} · ${ref}`, `<p>${esc(why)} <strong>${esc(String(row.name))}</strong> (${ref}), ${esc(route)}: ${usd(it.amount)} due ${fmtDay(it.due)}. Please contact them.</p>`, "trip_builder_gave_up_ops");
        results.push({ ref, n: it.n, gaveUp: why });
      };
      if (row.start_date && String(row.start_date) < today) { await give("The departure date has passed without this payment being taken."); continue; }
      if (!row.stripe_customer_id || !row.stripe_payment_method_id) { await give("There is no card saved for this trip."); continue; }
      try {
        const pi = await stripe.paymentIntents.create({
          amount: Math.round(it.amount * 100), currency: "usd", customer: row.stripe_customer_id as string, payment_method: row.stripe_payment_method_id as string,
          off_session: true, confirm: true, description: `Trip builder payment ${it.n} of ${items.length} · ref ${ref}`,
          metadata: { kind: "trip_builder_scheduled", ref, n: String(it.n) },
        }, { idempotencyKey: `tbpay:${ref}:${it.n}:${it.attempts}` }); // a double run, or a lost DB write, can't charge twice
        if (pi.status !== "succeeded") throw new Error(`payment ${pi.status}`);
        it.status = "paid"; it.paid_at = now.toISOString(); it.payment_intent = pi.id; it.last_error = null; it.retry_after = null; changed = true;
        const left = items.filter((i) => i.status !== "paid"), next = upcoming();
        if (to) {
          const m = tripBuilderReceiptEmail({ firstName: first, ref, route, amount: usd(it.amount), remaining: usd(left.reduce((a, i) => a + i.amount, 0)), nextDue: next ? fmtDay(next.due) : "", nextAmount: next ? usd(next.amount) : "", statusUrl });
          await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_receipt" }).catch((e) => console.warn("receipt email failed", e));
        }
        results.push({ ref, n: it.n, charged: it.amount });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        it.attempts += 1; it.last_error = msg.slice(0, 300); changed = true;
        const final = it.attempts >= MAX_ATTEMPTS;
        if (final) it.status = "gave_up"; else {
          it.status = "failed";
          const next = new Date(addDays(today, RETRY_DAYS) + "T14:00:00Z"); it.retry_after = next.toISOString();
        }
        if (to) {
          const m = tripBuilderPaymentFailedEmail({ firstName: first, ref, route, amount: usd(it.amount), nextTry: it.retry_after ? fmtDay(it.retry_after) : "", final, statusUrl });
          await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_payment_failed" }).catch((e2) => console.warn("failed-payment email failed", e2));
        }
        await alertEwan(`Trip builder: ${usd(it.amount)} from ${row.name} didn't go through · ${ref}`, `<p><strong>${esc(String(row.name))}</strong> (${ref}), ${esc(route)}: ${usd(it.amount)} due ${fmtDay(it.due)} was declined (${esc(msg)}). Attempt ${it.attempts} of ${MAX_ATTEMPTS}. ${final ? "We've stopped trying: please contact them." : `We'll try again ${fmtDay(it.retry_after)}.`}</p>`, "trip_builder_payment_failed_ops");
        results.push({ ref, n: it.n, error: msg, attempts: it.attempts });
      }
    }

    if (changed) {
      const done = allPaid(items);
      const { error: uErr } = await sb.from("trip_builder_requests").update({ pay_schedule: items, balance_paid_at: done ? now.toISOString() : null, updated_at: now.toISOString() }).eq("ref", ref);
      if (uErr) console.error(`trip builder schedule save failed for ${ref}:`, uErr.message);
      if (done) await alertEwan(`Trip builder: ${row.name} is paid in full · ${ref}`, `<p><strong>${esc(String(row.name))}</strong> (${ref}), ${esc(route)}: all ${items.length} payments are in (${usd(paidSoFar(items))} on top of the deposit). </p>`, "trip_builder_paid_ops");
    }
  }
  return json({ ok: true, processed: rows?.length ?? 0, results });
});
