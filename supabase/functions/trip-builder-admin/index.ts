// Admin > Trip builder (Charlie, 19 Oct 2026). Gated like squad-admin (admin
// token, or the admin password in the body).
//   list                              every request, newest first
//   checking   {ref, note?}           a crew member has picked it up
//   balance    {ref, amount, note?}   approve: the price the guest pays (less any deposit); they get the "ready" email and choose how to pay
//   decline    {ref, note?, refund}   can't make it work; refunds the deposit when refund=true
//   booked     {ref, note?}           paid some other way: mark it done
//   note       {ref, note}            save the crew note only
//   view       {ref}                  one request, with the trip summary and a suggested balance (the crew review page)
//   revise     {ref, trip, summary, crewText, note}   the crew's edited version of the guest's trip (Edit it)
//   link       {ref}                  a fresh signed link to the crew review page (admin only)
//
// Two ways in. The admin token / password can do everything. A crew key (from the link in the
// new-trip email, see _shared/trip-builder-crew.ts) can do everything EXCEPT list and link, and only
// for the one trip it was made for, and only while that trip is still being checked.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { adminAuthHeaderToken, safeEqual, verifyAdminToken } from "../_shared/admin-auth.ts";
import { isTrustedOrigin } from "../_shared/app-base.ts";
import { sendEmail, TRIP_BUILDER_CONTACT, tripBuilderDeclinedEmail, tripBuilderReadyEmail } from "../_shared/email.ts";
import { builderStatusUrl, fmtDay, needsDeposit, usd } from "../_shared/trip-builder.ts";
import { crewReviewUrl, guestTripUrl, readSummary, signCrewKey, signGuestKey, suggestBalance, verifyCrewKey } from "../_shared/trip-builder-crew.ts";
import { LATE_DAYS, payOptions, readSchedule } from "../_shared/trip-builder-pay.ts";
import { currentRev, lastRevision } from "../_shared/trip-builder-revise.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const LIVE_ORIGIN = "https://madmonkeyhostels.com";
/** A link to the trip builder on one of our own sites (the crew's edited trip, and what we hand back to the page). */
const ownLink = (u: string) => { try { return isTrustedOrigin(new URL(u).origin) && u.includes("#/build/"); } catch { return false; } };

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
    authed = !!pw && safeEqual(pw, adminPassword);
  }
  // The key in a crew review link: good for one trip only.
  const bodyRef = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";
  const keyed = !authed && /^MM-[A-Z0-9]{6}$/.test(bodyRef) && await verifyCrewKey(bodyRef, body.key);
  if (!authed && !keyed) return json({ error: typeof body.key === "string" ? "This link has expired or isn't valid. Open the trip from Admin > Trip builder instead." : "Unauthorized" }, 401);

  const sb = createClient(url, key);
  const action = typeof body.action === "string" ? body.action : "list";

  if (keyed && (action === "list" || action === "link")) return json({ error: "Unauthorized" }, 401);

  if (action === "list") {
    const { data, error } = await sb
      .from("trip_builder_requests")
      .select("ref,status,name,contact_via,email,whatsapp,guest_email,from_place,party_size,dates_flex,start_date,route,days,nights,stops,est_total_usd,all_in_match,trip_link,itinerary,notes,campaign_ref,from_hostel,deposit_amount,deposit_paid_at,hold_until,balance_amount,balance_url,balance_paid_at,pay_plan,pay_schedule,refunded_at,crew_note,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, requests: data ?? [] });
  }

  const ref = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";
  const { data: row, error: rErr } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (rErr) return json({ error: rErr.message }, 500);
  if (!row) return json({ error: `No trip ${ref}` }, 404);
  // A crew link only works while the trip is still being checked. After that it is read-only.
  const OPEN = ["submitted", "checking", "ready"];
  if (keyed && action !== "view" && !OPEN.includes(String(row.status))) {
    return json({ error: `This trip is already ${row.status === "approved" ? "booked" : row.status}, so there is nothing left to action here.` }, 409);
  }

  if (action === "view") {
    const sum = readSummary(row.payload);
    const VIEW = ["ref", "status", "name", "contact_via", "email", "whatsapp", "guest_email", "from_place", "party_size", "dates_flex", "start_date", "route", "days", "nights", "est_total_usd",
      "all_in_match", "trip_link", "itinerary", "notes", "campaign_ref", "from_hostel", "deposit_amount", "deposit_paid_at", "hold_until", "balance_amount", "balance_url", "balance_paid_at",
      "pay_plan", "pay_schedule", "refunded_at", "crew_note", "created_at", "updated_at"];
    const request: Record<string, unknown> = {};
    for (const k of VIEW) request[k] = (row as Record<string, unknown>)[k] ?? null;
    const pl = (row.payload ?? {}) as Record<string, unknown>;
    const orig = pl.original as { trip?: Record<string, unknown> } | undefined;
    const original = orig?.trip ? { trip: { route: String(orig.trip.route ?? "").slice(0, 400), days: Number(orig.trip.days) || 0, estTotalUsd: orig.trip.estTotalUsd == null ? null : Number(orig.trip.estTotalUsd), link: ownLink(String(orig.trip.link ?? "")) ? String(orig.trip.link).slice(0, 2000) : "" } } : null;
    // rev counts the guest's changes after sending; guestRevision is the latest one (what moved, their note, what it replaced).
    return json({ ok: true, request, summary: sum, suggestedBalance: suggestBalance(sum, Number(row.deposit_amount)), revision: pl.revision ?? null, original, canAct: OPEN.includes(String(row.status)), rev: currentRev(pl), guestRevision: lastRevision(pl) });
  }
  // The crew page tells us which version of the trip it was showing. If the guest has changed it since, nothing is approved, declined or edited
  // on a plan nobody has seen: they reload and look at the new one first.
  const WRITES = ["checking", "revise", "booked", "balance", "decline"];
  if (WRITES.includes(action) && body.rev !== undefined && Number(body.rev) !== currentRev(row.payload)) {
    return json({ error: "The guest has just changed this trip. Reload the page to see their new version before you decide.", stale: true }, 409);
  }
  if (action === "link") {
    const k = await signCrewKey(row.ref);
    return json({ ok: true, url: crewReviewUrl(LIVE_ORIGIN, row.ref, k), approveUrl: crewReviewUrl(LIVE_ORIGIN, row.ref, k, "approve"),
      declineUrl: crewReviewUrl(LIVE_ORIGIN, row.ref, k, "decline"), editUrl: crewReviewUrl(LIVE_ORIGIN, row.ref, k, "edit") });
  }

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
      if (needsDeposit(row)) return json({ error: "The deposit isn't paid yet." }, 400);
      await save({ status: "checking", crew_note: note || null });
      return json({ ok: true });
    }
    if (action === "revise") {
      // The crew's edited version of the guest's trip (the builder's "Edit it" bar). The guest's own version is kept in payload.original.
      if (needsDeposit(row)) return json({ error: "The deposit isn't paid yet." }, 400);
      if (!["submitted", "checking"].includes(String(row.status))) {
        return json({ error: "The balance link has already gone out. Save a note instead, or use Approve to send a new link." }, 409);
      }
      const t = (body.trip ?? {}) as Record<string, unknown>;
      const sum = readSummary({ summary: body.summary });
      const link = typeof t.link === "string" ? t.link.trim().slice(0, 2000) : "";
      const route = typeof t.route === "string" ? t.route.trim().slice(0, 400) : "";
      const days = Math.round(Number(t.days) || 0);
      if (!ownLink(link) || !route || days < 1) return json({ error: "That edited trip didn't come through properly. Open it from the email again and retry." }, 400);
      const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, n) : []);
      const payload = ((row.payload ?? {}) as Record<string, unknown>);
      const original = payload.original ?? { trip: { link: row.trip_link, route: row.route, days: row.days, nights: row.nights, stops: row.stops, start: row.start_date, estTotalUsd: row.est_total_usd }, summary: payload.summary ?? null };
      const crewText = typeof body.crewText === "string" ? body.crewText.slice(0, 20_000) : "";
      const revision = { at: now, note: note || null, route, days, estTotalUsd: Number.isFinite(Number(t.estTotalUsd)) ? Number(t.estTotalUsd) : null };
      await save({
        trip_link: link, route, days, nights: Math.round(Number(t.nights) || 0) || null,
        stops: strs(t.stops, 40), countries: strs(t.countries, 10),
        start_date: typeof t.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.start) ? t.start : null,
        est_total_usd: Number.isFinite(Number(t.estTotalUsd)) ? Number(t.estTotalUsd) : row.est_total_usd,
        itinerary: crewText || (typeof body.itinerary === "string" ? body.itinerary.slice(0, 20_000) : row.itinerary),
        crew_note: note || row.crew_note || null,
        status: "checking",
        payload: { ...payload, ...(sum ? { summary: body.summary } : {}), ...(crewText ? { crewText } : {}), original, revision },
      });
      return json({ ok: true, suggestedBalance: suggestBalance(sum, Number(row.deposit_amount)) });
    }
    if (action === "booked") {
      await save({ status: "approved", crew_note: note || null });
      return json({ ok: true });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 503);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (action === "balance") {
      // The crew approves the trip: record the price and invite the guest to choose how to pay it. No Stripe link is made here:
      // the Checkout page is made when they choose, so it never goes stale in their inbox. Any deposit they paid is already counted.
      if (needsDeposit(row)) return json({ error: "The deposit isn't paid yet." }, 400);
      if (row.balance_paid_at) return json({ error: "The balance is already paid." }, 400);
      if (String(row.status) === "approved" && readSchedule(row.pay_schedule).length) return json({ error: "They've already chosen how to pay and are booked. Change a payment from Stripe, or reply to them." }, 409);
      const amount = Math.round(Number(body.amount) * 100) / 100;
      if (!(amount >= 1 && amount <= 50_000)) return json({ error: Number(row.deposit_amount) > 0 ? "Enter the balance in US dollars (after the deposit)." : "Enter the price in US dollars." }, 400);
      await save({ status: "ready", balance_amount: amount, balance_session_id: null, balance_url: null, pay_plan: null, pay_schedule: [], crew_note: note || null });
      const tripUrl = guestTripUrl(LIVE_ORIGIN, row.ref, await signGuestKey(row.ref));
      let emailed = false;
      if (to) {
        const opts = payOptions({ balance: amount, start: row.start_date as string | null });
        const choices = opts.map((o) => o.plan === "now" ? `Pay all ${usd(amount)} now`
          : o.plan === "later" ? `Pay ${usd(amount)} automatically on ${fmtDay(o.items[0].due)}, ${LATE_DAYS} days before you leave`
          : `Pay in ${o.count} instalments of about ${usd(o.items[0].amount)}: the first now, then one every 30 days`);
        const m = tripBuilderReadyEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", balance: usd(amount), note, payUrl: tripUrl, statusUrl, planUrl: (row.trip_link as string | null) || undefined, choices, hasDeposit: Number(row.deposit_amount) > 0 });
        await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_ready" });
        emailed = true;
      }
      return json({ ok: true, url: tripUrl, emailed });
    }

    if (action === "decline") {
      // Declining only ever refunds the deposit, so once they've paid anything towards the balance it has to be settled by hand.
      if (row.balance_paid_at || readSchedule(row.pay_schedule).some((i) => i.status === "paid")) {
        return json({ error: "They've already paid towards this trip, so it can't be declined here. Refund the payments from Stripe, then mark it as you see fit." }, 409);
      }
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
