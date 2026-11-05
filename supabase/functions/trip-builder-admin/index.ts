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
//   cancel-payments {ref, note?}      the trip is off: close any booked trip, stop what is left to pay and free its ALL IN spots (admin only). Refunds are still done by hand in Stripe, and nothing is emailed
//   move-dates {ref, start}           move a booked trip to a new start date: its ALL IN departure, the payments still to come and every date on it move together, and the guest, the crew and the ALL IN team are told (admin only)
//   to-book-tick {ref, key, done}     tick an item on a booked trip's "to book" list, so nobody books it twice or misses it (admin only)
//   add-all-in {ref}                  put the ALL IN part of a booked trip into bookings, for trips booked before this ran or that hit a problem (admin only)
//   crew-list                         Find your crew: everyone opted in whose trip isn't declined or over, and where each introduction is (admin only)
//   crew-intro {a, b, status, by}     record where an introduction is: new / asked / yes / introduced / no (admin only)
//   crew-off   {ref}                  they asked to stop: their answers are removed and they drop off the board (admin only)
//
// Two ways in. The admin token / password can do everything. A crew key (from the link in the
// new-trip email, see _shared/trip-builder-crew.ts) can do everything EXCEPT list, link, cancel-payments, move-dates, to-book-tick, add-all-in and the crew-* actions, and only
// for the one trip it was made for, and only while that trip is still being checked.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { adminAuthHeaderToken, safeEqual, verifyAdminToken } from "../_shared/admin-auth.ts";
import { isTrustedOrigin } from "../_shared/app-base.ts";
import { OPS_NOTIFY_EMAILS, sendEmail, TRIP_BUILDER_CONTACT, tripBuilderDatesMovedEmail, tripBuilderDeclinedEmail, tripBuilderReadyEmail, tripBuilderToBookBlock } from "../_shared/email.ts";
import { builderStatusUrl, fmtDay, laterDeposit, needsDeposit, teamCc, usd } from "../_shared/trip-builder.ts";
import { crewReviewUrl, guestTripUrl, readSummary, signCrewKey, signGuestKey, suggestBalance, verifyCrewKey } from "../_shared/trip-builder-crew.ts";
import { allInKeysBooked, allInSessionForKey, closeTrip, moveAllInBookings, movedTrip, syncAllInBookings, toBookList } from "../_shared/trip-builder-book.ts";
import { INTRO_STATUSES, introPair, onCrewBoard } from "../_shared/trip-builder-find-crew.ts";
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

  if (keyed && (action === "list" || action === "link" || action === "cancel-payments" || action === "move-dates" || action === "to-book-tick" || action === "add-all-in" || action.startsWith("crew-"))) return json({ error: "Unauthorized" }, 401);

  // Find your crew. Only the crew board reads this, and the site never shows it to another guest.
  if (action === "crew-list") {
    const { data, error } = await sb.from("trip_builder_requests")
      .select("ref,status,name,party_size,contact_via,email,guest_email,whatsapp,route,start_date,days,trip_link,find_crew")
      .not("find_crew", "is", null).order("created_at", { ascending: false }).limit(1000);
    if (error) return json({ error: error.message }, 500);
    const travellers = (data ?? []).filter((r) => onCrewBoard(r)).map((r) => ({
      ref: r.ref, name: r.name, party_size: r.party_size, contact_via: r.contact_via, email: r.email || r.guest_email || null, whatsapp: r.whatsapp, route: r.route,
      start_date: r.start_date, days: r.days, trip_link: r.trip_link, find_crew: r.find_crew,
    }));
    const on = new Set(travellers.map((t) => t.ref));
    const { data: pairs, error: iErr } = await sb.from("trip_builder_crew_intros").select("a,b,status,updated_by,updated_at").limit(5000);
    if (iErr) return json({ error: iErr.message }, 500);
    const intros = (pairs ?? []).filter((i) => on.has(i.a) && on.has(i.b)).map((i) => ({ a: i.a, b: i.b, status: i.status, by: i.updated_by, at: i.updated_at }));
    return json({ ok: true, travellers, intros });
  }
  if (action === "crew-intro") {
    const pair = introPair(body.a, body.b);
    if (!pair) return json({ error: "That needs two different trips." }, 400);
    if (typeof body.status !== "string" || !INTRO_STATUSES.includes(body.status)) return json({ error: `Status must be one of ${INTRO_STATUSES.join(", ")}.` }, 400);
    const at = new Date().toISOString();
    const { error } = await sb.from("trip_builder_crew_intros").upsert({ ...pair, status: body.status, updated_by: typeof body.by === "string" ? body.by.trim().slice(0, 60) || null : null, updated_at: at }, { onConflict: "a,b" });
    if (error) return json({ error: /foreign key/i.test(error.message) ? "One of those trips doesn't exist." : error.message }, /foreign key/i.test(error.message) ? 404 : 500);
    return json({ ok: true, ...pair, status: body.status, at });
  }
  if (action === "crew-off") {
    if (!/^MM-[A-Z0-9]{6}$/.test(bodyRef)) return json({ error: "Unknown trip" }, 404);
    const { data, error } = await sb.from("trip_builder_requests").update({ find_crew: null, updated_at: new Date().toISOString() }).eq("ref", bodyRef).select("ref");
    if (error) return json({ error: error.message }, 500);
    if (!data?.length) return json({ error: `No trip ${bodyRef}` }, 404);
    return json({ ok: true, ref: bodyRef });
  }

  if (action === "list") {
    const { data, error } = await sb
      .from("trip_builder_requests")
      .select("ref,status,name,contact_via,email,whatsapp,guest_email,from_place,party_size,dates_flex,start_date,route,days,nights,stops,est_total_usd,all_in_match,trip_link,itinerary,notes,campaign_ref,from_hostel,deposit_amount,deposit_paid_at,hold_until,balance_amount,balance_url,balance_paid_at,pay_plan,pay_schedule,refunded_at,crew_note,created_at,updated_at,payload,booked_items")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return json({ error: error.message }, 500);
    const inBookings = await allInKeysBooked(sb);
    // A booked trip carries its "to book" list. The payload itself stays on the server.
    const requests = (data ?? []).map(({ payload, ...r }) => ({
      ...r,
      to_book: r.status === "approved"
        ? toBookList(readSummary(payload), Number(r.party_size ?? 1)).map((i) => ({ ...i, in_bookings: i.kind === "allin" && inBookings.has(allInSessionForKey(String(r.ref), i.key)) }))
        : [],
    }));
    return json({ ok: true, requests });
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
      "pay_plan", "pay_schedule", "refunded_at", "crew_note", "created_at", "updated_at", "find_crew"];
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
      // Paid some other way, so the ALL IN part still has to go into bookings.
      const allIn = await syncAllInBookings(sb, { ...row, status: "approved" });
      return json({ ok: true, allIn });
    }
    if (action === "move-dates") {
      const start = typeof body.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.start) ? body.start : "";
      const today = now.slice(0, 10);
      if (String(row.status) !== "approved") return json({ error: "Only a booked trip can be moved here. Before it's booked, use the review page." }, 409);
      if (!row.start_date) return json({ error: "This trip has no start date to move." }, 409);
      if (String(row.start_date) <= today) return json({ error: "This trip has already started, so it can't be moved here." }, 409);
      if (!start || start <= today) return json({ error: "Pick a new start date in the future." }, 400);
      if (start === row.start_date) return json({ error: "That's the date it already starts on." }, 400);
      const people = Number(row.party_size ?? 1);
      const before = toBookList(readSummary(row.payload), people);
      const ticked = before.filter((i) => ((row.booked_items ?? {}) as Record<string, unknown>)[i.key]).map((i) => i.text);
      const m = movedTrip(row, start);
      const moved = await moveAllInBookings(sb, row, m.days);
      if (moved.problem) return json({ error: moved.problem }, 409);
      // Ticks are per date, so the old ones drop away: anything booked for the old dates has to be rebooked.
      await save(m.patch);
      const newRow = { ...row, ...m.patch };
      const allIn = await syncAllInBookings(sb, newRow);
      const route = String(row.route ?? "your trip");
      if (to) {
        const g = tripBuilderDatesMovedEmail({ firstName: first, ref, route, startDate: fmtDay(start), nextAmount: m.nextPayment ? usd(m.nextPayment.amount) : "", nextDue: m.nextPayment ? fmtDay(m.nextPayment.due) : "", statusUrl: guestTripUrl(LIVE_ORIGIN, ref, await signGuestKey(ref)) });
        await sendEmail({ to, subject: g.subject, html: g.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_dates_moved" }).catch((e) => console.warn("dates moved email failed", e));
      }
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const list = tripBuilderToBookBlock({ ref, name: String(row.name), people, paid: "new dates", items: toBookList(readSummary(newRow.payload), people), allIn });
      const undo = ticked.length ? `<p><strong>Already booked on the old dates, so these need changing:</strong></p><ul>${ticked.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
      await sendEmail({ to: TRIP_BUILDER_CONTACT, cc: teamCc(), subject: `Trip builder: ${row.name}'s trip moved to ${fmtDay(start)} · ${ref}`, html: `<p><strong>${esc(String(row.name))}</strong> (${ref}) now starts ${fmtDay(start)}, not ${fmtDay(String(row.start_date))}. Their ALL IN and later payments have moved and they've been emailed.</p>${undo}${list}`, templateName: "trip_builder_dates_moved_ops" }).catch((e) => console.warn("dates moved crew email failed", e));
      if (moved.moved.length) {
        await sendEmail({ to: OPS_NOTIFY_EMAILS, subject: `ALL IN booking moved: ${row.name} · ${ref}`, html: `<p><strong>${esc(String(row.name))}</strong> (${ref}, ${people} ${people === 1 ? "spot" : "spots"}) has moved:</p><ul>${moved.moved.map((x) => `<li>${esc(x.name)}: ${fmtDay(x.from)} to ${fmtDay(x.to)}</li>`).join("")}</ul><p>The spaces on both departures are already updated.</p>`, templateName: "trip_builder_all_in_moved_ops" }).catch((e) => console.warn("ALL IN moved email failed", e));
      }
      return json({ ok: true, days: m.days, allIn });
    }
    if (action === "add-all-in") {
      if (String(row.status) !== "approved") return json({ error: "Only a booked trip can go into ALL IN bookings." }, 409);
      const allIn = await syncAllInBookings(sb, row);
      if (!allIn.length) return json({ error: "This trip has no ALL IN in it." }, 409);
      const problem = allIn.find((a) => !a.added)?.problem;
      if (problem) return json({ error: problem }, 409);
      return json({ ok: true, allIn });
    }
    if (action === "to-book-tick") {
      const tick = typeof body.key === "string" ? body.key.slice(0, 200) : "";
      if (!tick) return json({ error: "Which item?" }, 400);
      const booked = { ...((row.booked_items ?? {}) as Record<string, unknown>) };
      if (body.done === true) booked[tick] = { at: now }; else delete booked[tick];
      await save({ booked_items: booked });
      return json({ ok: true, booked_items: booked });
    }

    if (action === "cancel-payments") {
      // The trip is off, whether or not anything is left to pay (a refund in Stripe does not stop the schedule). Closing it takes it out of the daily charge job.
      if (String(row.status) !== "approved") return json({ error: "Only a booked trip can be closed here." }, 409);
      return json({ ok: true, ...(await closeTrip(sb, row, note)) });
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
        const opts = payOptions({ balance: amount, start: row.start_date as string | null, laterDeposit: laterDeposit(row) });
        const choices = opts.map((o) => o.plan === "now" ? `Pay all ${usd(amount)} now`
          : o.plan === "later" && o.count === 2 ? `Pay a ${usd(o.items[0].amount)} deposit now and the rest (${usd(o.items[1].amount)}) automatically on ${fmtDay(o.items[1].due)}, a week before you leave`
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
        return json({ error: "They've already paid towards this trip, so it can't be declined here. Use Stop the remaining payments in Admin > Trip builder, and refund what they paid in Stripe." }, 409);
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
