// Trip builder payments (Charlie, 19 Oct 2026). Ewan's trip builder is served
// from public/trip-builder. Sending a trip for checking is FREE (Ewan, 23 Oct 2026):
// trip-builder-request saves it as "submitted" and emails the crew at once
// (handleTripBuilderSubmitted below). Nothing is paid until the crew has checked the
// trip and set the price (trip-builder-admin) and the guest has chosen how to pay it
// (trip-builder-pay); stripe-webhook hands each payment to handleTripBuilderPaid.
// With the secret TRIP_BUILDER_DEPOSIT_PER_PERSON set, sending takes a deposit per
// person first, as it did before. Table: trip_builder_requests.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { trustedBase } from "./app-base.ts";
import {
  APP_URL,
  sendEmail,
  tripBuilderBookedEmail,
  tripBuilderConfirmedEmail,
  tripBuilderDepositEmail,
  tripBuilderOpsEmail,
  tripBuilderReceivedEmail,
  TRIP_BUILDER_CONTACT,
} from "./email.ts";
import { crewReviewUrl, guestTripUrl, readSummary, signCrewKey, signGuestKey, suggestBalance } from "./trip-builder-crew.ts";
import type { Update } from "./trip-builder-revise.ts";
import { allPaid, buildSchedule, daysUntil, type Item, LATE_DAYS, type Plan, readSchedule } from "./trip-builder-pay.ts";

// Trip builder enquiries are Ewan's (Charlie, 19 Oct 2026): every alert goes to
// him and every guest email replies to him, not the ALL IN ops list or cs@.
const EWAN = TRIP_BUILDER_CONTACT;

/** Anyone else who should get the new-trip email, e.g. TRIP_BUILDER_TEAM_EMAILS="sam@madmonkeyhostels.com, jo@madmonkeyhostels.com". Optional. */
export function teamCc(): string[] | undefined {
  const list = (Deno.env.get("TRIP_BUILDER_TEAM_EMAILS") ?? "").split(",").map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) && x.toLowerCase() !== EWAN.toLowerCase());
  return list.length ? list : undefined;
}

export const HOLD_HOURS = 48;
export const MAX_PEOPLE = 8;

/** US dollars per person taken when a trip is sent. 0, the default, means sending is free: nothing is paid until the crew has checked the trip and the guest
 *  chooses how to pay. Set the secret TRIP_BUILDER_DEPOSIT_PER_PERSON (e.g. 50) to bring the deposit back, and the builder's DEPOSIT_PER_PERSON to the same
 *  number. Read on every request, so a change to the secret needs no code change. */
export function depositPerPerson(): number {
  let v: string | undefined;
  try { v = Deno.env.get("TRIP_BUILDER_DEPOSIT_PER_PERSON"); } catch { /* no permission to read it, as in a plain `deno test`: free */ }
  return parseDeposit(v);
}
/** Whole US dollars from 1 to 1000, otherwise 0 (free): a typo in the secret can never charge anyone something odd. */
export function parseDeposit(v: unknown): number {
  const n = Math.round(Number(String(v ?? "").trim()));
  return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : 0;
}
/** True while a deposit is owed and not yet paid, so the crew can't act on the trip. A trip sent free has no deposit, so it is never waiting on one. */
export const needsDeposit = (row: { deposit_amount?: unknown; deposit_paid_at?: unknown }) => Number(row.deposit_amount) > 0 && !row.deposit_paid_at;

/** A first name that is safe to print in an email to somebody else's address: letters and a few marks only, otherwise "there". (A free trip can be sent with anyone's email.) */
export function plainFirstName(name: unknown): string {
  const first = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}\p{M}'’.-]{0,29}$/u.test(first) ? first : "there";
}
/** Text that reads as a route or a list of changes ("Hanoi → Hoi An: 4 nights"), or "" when it looks like anything else: a link, an address, a long message of its own. */
export function plainText(text: unknown, max = 160): string {
  const t = String(text ?? "").trim();
  return t.length > 0 && t.length <= max && /^[\p{L}\p{M}\p{N} .,:'’()+&/→>-]+$/u.test(t) && !/\bwww\b|https?|\.(com|net|org|co|io|me|info)\b/i.test(t) ? t : "";
}
export const usd = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** The builder's own address for a request's status page, on whichever site the guest used. */
export function builderStatusUrl(origin: string | null, ref: string): string {
  return `${trustedBase(origin)}/trip-builder/#/trip/${encodeURIComponent(ref)}`;
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtDayTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

type Row = Record<string, unknown> & {
  ref: string; name: string; status: string; route: string | null; days: number | null; start_date: string | null;
  party_size: number; deposit_amount: number; balance_amount: number | null; email: string | null; whatsapp: string | null;
  contact_via: string | null; guest_email: string | null; deposit_paid_at: string | null; balance_paid_at: string | null;
};

export const planLabel = (plan: string | null | undefined, withDeposit = true) => {
  const rest = withDeposit ? "the rest " : "";
  return plan === "later" ? `pay ${rest}on the card a week before you leave` : plan === "instalments" ? `pay ${rest}in instalments` : `pay ${rest}now`;
};

/** A saved payment schedule as rows for an email: "Today $200 Paid", "Mon 12 Jan $200 Due". */
export function scheduleRows(items: Item[]): { amount: string; due: string; paid: boolean }[] {
  const today = new Date().toISOString().slice(0, 10);
  return items.map((i) => ({ amount: usd(i.amount), due: i.due === today ? "Today" : fmtDay(i.due), paid: i.status === "paid" }));
}

function stripeFromEnv(): Stripe | null {
  const k = Deno.env.get("STRIPE_SECRET_KEY");
  return k ? new Stripe(k, { apiVersion: "2025-08-27.basil" }) : null;
}

/** The guest has chosen how to pay and is booked: tell them (with their payment table) and tell Ewan. */
export async function notifyBooked(row: Row, items: Item[], origin: string | null, key: string): Promise<void> {
  const first = String(row.name ?? "").trim().split(/\s+/)[0] || "there";
  const to = (row.guest_email as string | null) || (row.email as string | null);
  const statusUrl = guestTripUrl(origin, row.ref, key);
  const plan = String(row.pay_plan ?? "now");
  if (to) {
    const m = tripBuilderBookedEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", planLabel: planLabel(plan, Number(row.deposit_amount) > 0), deposit: Number(row.deposit_amount) > 0 ? usd(Number(row.deposit_amount)) : "", schedule: scheduleRows(items), statusUrl, startDate: fmtDay(row.start_date) });
    await sendEmail({ to, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_booked" }).catch((e) => console.warn("trip builder booked email failed", e));
  }
  const rows = items.map((i) => `${i.status === "paid" ? "Paid" : "Due"} ${fmtDay(i.due)}: ${usd(i.amount)}`).join("<br>");
  await sendEmail({
    to: EWAN, cc: teamCc(),
    subject: `Trip builder: ${row.name} is booked and will ${planLabel(plan, Number(row.deposit_amount) > 0)} · ${row.ref}`,
    html: `<p><strong>${esc(String(row.name))}</strong> approved ${esc(String(row.route ?? ""))} (${row.ref}) and chose to ${esc(planLabel(plan, Number(row.deposit_amount) > 0))}. It's booked: make sure the beds are locked in.</p><p>${rows}</p>`,
    templateName: "trip_builder_booked_ops",
  }).catch((e) => console.warn("trip builder booked ops email failed", e));
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The new-trip email to Ewan and the team: the whole trip as the guest built it, with Approve / Not approved / Edit it. With `update` it is the guest's changed version of a trip the crew already has. */
export async function notifyCrew(row: Row, guestEmail: string | null, holdUntil: string | null, origin: string | null, update?: Update): Promise<void> {
  const deposit = Number(row.deposit_amount) > 0 ? usd(Number(row.deposit_amount)) : "";      // "" = free to send
  const contact = row.contact_via === "whatsapp" ? `WhatsApp ${row.whatsapp ?? ""}` : `Email ${row.email ?? ""}`;
  // The whole trip as the guest built it (payload.summary), and three one-tap links into the crew review page. Older trips have no summary: the email falls back to the plain itinerary.
  const summary = readSummary(row.payload);
  const key = await signCrewKey(row.ref);
  const ops = tripBuilderOpsEmail({
    ref: row.ref, name: String(row.name), contact, guestEmail: guestEmail ?? "", guestWhatsapp: row.contact_via === "whatsapp" ? String(row.whatsapp ?? "") : "",
    people: Number(row.party_size ?? 1),
    route: row.route ?? "", days: Number(row.days ?? 0), startDate: fmtDay(row.start_date), dates: String(row.dates_flex ?? ""),
    estTotal: row.est_total_usd != null ? `${usd(Number(row.est_total_usd))} (builder estimate)` : "",
    deposit, allInMatch: String(row.all_in_match ?? ""), notes: update ? update.note : String(row.notes ?? ""), itinerary: String(row.itinerary ?? ""),
    tripLink: String(row.trip_link ?? ""), adminUrl: `${APP_URL}/admin`, holdUntil: fmtDayTime(holdUntil),
    summary,
    reviewUrl: crewReviewUrl(origin, row.ref, key), approveUrl: crewReviewUrl(origin, row.ref, key, "approve"),
    declineUrl: crewReviewUrl(origin, row.ref, key, "decline"), editUrl: crewReviewUrl(origin, row.ref, key, "edit"),
    suggestedBalance: summary ? usd(suggestBalance(summary, Number(row.deposit_amount))) : "",
    update,
  });
  await sendEmail({ to: EWAN, cc: teamCc(), subject: ops.subject, html: ops.html, replyTo: guestEmail ?? undefined, templateName: update ? "trip_builder_ops_update" : "trip_builder_ops" }).catch((e) => console.warn("trip builder ops email failed", e));
}

const alertEwan = (subject: string, html: string, templateName: string) => sendEmail({ to: EWAN, cc: teamCc(), subject, html, templateName }).catch((e) => console.warn(`${templateName} email failed`, e));

/** A trip sent free is already saved as "submitted": tell the guest we have it (if they gave an email) and tell Ewan and the team, the same email as for a paid trip. */
export async function handleTripBuilderSubmitted(row: Row, origin: string | null): Promise<void> {
  const guestEmail = (row.email as string | null) || (row.guest_email as string | null) || null;
  const holdUntil = (row.hold_until as string | null) || null;
  if (guestEmail) {
    const m = tripBuilderReceivedEmail({
      firstName: plainFirstName(row.name), ref: row.ref, route: plainText(row.route), days: Number(row.days ?? 0), startDate: fmtDay(row.start_date),
      people: Number(row.party_size ?? 1), holdUntil: fmtDayTime(holdUntil), statusUrl: guestTripUrl(origin, row.ref, await signGuestKey(row.ref)),   // with their key: it's how they change the trip after sending it
    });
    await sendEmail({ to: guestEmail, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_received" }).catch((e) => console.warn("trip builder guest email failed", e));
  }
  await notifyCrew(row, guestEmail, holdUntil, origin);
}

/** The card a guest just saved or paid with, read from Stripe (never from the browser) so later payments can be charged to it. */
async function readCard(session: Stripe.Checkout.Session, pi: string | null, si: string | null): Promise<{ customer: string | null; method: string | null }> {
  let customer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null, method: string | null = null;
  try {
    const stripe = stripeFromEnv();
    if (stripe && pi) {
      const p = await stripe.paymentIntents.retrieve(pi);
      method = typeof p.payment_method === "string" ? p.payment_method : p.payment_method?.id ?? null;
      customer = customer ?? (typeof p.customer === "string" ? p.customer : p.customer?.id ?? null);
    } else if (stripe && si) {
      const t = await stripe.setupIntents.retrieve(si);
      method = typeof t.payment_method === "string" ? t.payment_method : t.payment_method?.id ?? null;
      customer = customer ?? (typeof t.customer === "string" ? t.customer : t.customer?.id ?? null);
    }
  } catch (e) { console.warn("trip builder: couldn't read the saved card", e instanceof Error ? e.message : e); }
  return { customer, method };
}

/** checkout.session.completed with metadata.kind trip_builder_deposit / trip_builder_balance / trip_builder_instalment / trip_builder_card. Idempotent. */
export async function handleTripBuilderPaid(sb: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  const meta = (session.metadata ?? {}) as Record<string, string>;
  const ref = meta.ref ?? "";
  const { data, error } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (error || !data) {
    console.warn(`trip builder payment for unknown ref ${ref}:`, error?.message ?? "not found");
    return;
  }
  const row = data as Row;
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const guestEmail = session.customer_details?.email || session.customer_email || row.guest_email || row.email || null;
  const first = String(row.name ?? "").trim().split(/\s+/)[0] || "there";
  const statusUrl = builderStatusUrl(meta.origin || null, row.ref);
  const now = new Date();

  if (meta.kind === "trip_builder_deposit") {
    if (row.deposit_paid_at) return;
    const holdUntil = row.start_date ? new Date(now.getTime() + HOLD_HOURS * 3600_000).toISOString() : null;
    // The deposit checkout saves the card (setup_future_usage) so the rest can be charged on the schedule the guest picks later.
    let customer = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null, method: string | null = null;
    try {
      const stripe = pi ? stripeFromEnv() : null;
      if (stripe && pi) {
        const p = await stripe.paymentIntents.retrieve(pi);
        method = typeof p.payment_method === "string" ? p.payment_method : p.payment_method?.id ?? null;
        customer = customer ?? (typeof p.customer === "string" ? p.customer : p.customer?.id ?? null);
      }
    } catch (e) { console.warn("trip builder: couldn't read the saved card", e instanceof Error ? e.message : e); }
    const { error: uErr } = await sb.from("trip_builder_requests").update({
      status: "submitted",
      deposit_paid_at: now.toISOString(),
      deposit_payment_intent: pi,
      stripe_customer_id: customer,
      stripe_payment_method_id: method,
      guest_email: guestEmail,
      hold_until: holdUntil,
      updated_at: now.toISOString(),
    }).eq("ref", row.ref);
    if (uErr) throw new Error(`trip builder deposit save: ${uErr.message}`);

    const deposit = usd(Number(row.deposit_amount));
    if (guestEmail) {
      const m = tripBuilderDepositEmail({
        firstName: first, ref: row.ref, route: row.route ?? "Your trip", days: Number(row.days ?? 0),
        startDate: fmtDay(row.start_date), deposit, people: Number(row.party_size ?? 1),
        holdUntil: fmtDayTime(holdUntil), statusUrl: guestTripUrl(meta.origin || null, row.ref, await signGuestKey(row.ref)),   // with their key: it's how they change the trip after sending it
      });
      await sendEmail({ to: guestEmail, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_deposit" }).catch((e) => console.warn("trip builder guest email failed", e));
    }
    await notifyCrew(row, guestEmail, holdUntil, meta.origin || null);
    return;
  }

  if (meta.kind === "trip_builder_card") {
    // The guest chose "pay a week before I leave" and had no card on file, so they were sent to save one on Checkout (nothing is charged). They are booked here, once the card is safe.
    if (String(row.status) === "approved") return;                              // already booked (the webhook was delivered twice)
    const si = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id ?? null;
    const card = await readCard(session, null, si);
    if (!card.method) {
      await alertEwan(`Trip builder: ${row.name} saved a card but we couldn't read it · ${row.ref}`,
        `<p><strong>${esc(String(row.name))}</strong> (${row.ref}) chose to pay a week before they leave and finished the card page, but Stripe didn't give us a card. They are NOT booked: ask them to choose again from their trip page.</p>`, "trip_builder_no_card_ops");
      throw new Error("trip builder card: Stripe gave no saved card");
    }
    const cardPatch = { stripe_customer_id: card.customer, stripe_payment_method_id: card.method, guest_email: row.guest_email || guestEmail, updated_at: now.toISOString() };
    const balance = Number(row.balance_amount), asked = Number(meta.amt);
    // Only book what they were shown: if the crew changed the price, or the trip moved, while they were on the card page, keep the card and let them choose again.
    const stillRight = String(row.status) === "ready" && balance >= 1 && Math.abs(balance - asked) < 0.005 && (daysUntil(row.start_date as string | null, now) ?? 0) > LATE_DAYS;
    if (!stillRight) {
      await sb.from("trip_builder_requests").update(cardPatch).eq("ref", row.ref);
      await alertEwan(`Trip builder: ${row.name} saved a card, but the trip changed first · ${row.ref}`,
        `<p><strong>${esc(String(row.name))}</strong> (${row.ref}) saved a card for "pay a week before I leave", but the price or the trip changed while they were on that page, so they are NOT booked on it. Their card is on file: they can choose again from their trip page.</p>`, "trip_builder_card_changed_ops");
      return;
    }
    const items = buildSchedule("later", balance, row.start_date as string | null, now);
    const { data: won, error: bErr } = await sb.from("trip_builder_requests").update({ ...cardPatch, status: "approved", pay_plan: "later", pay_schedule: items, plan_chosen_at: now.toISOString() }).eq("ref", row.ref).eq("status", "ready").select("ref");
    if (bErr) throw new Error(`trip builder card save: ${bErr.message}`);
    if (!won || !won.length) return;                                            // another delivery booked it first
    await notifyBooked({ ...row, ...cardPatch, pay_plan: "later", status: "approved" } as Row, items, meta.origin || null, await signGuestKey(row.ref));
    return;
  }

  if (meta.kind === "trip_builder_balance" || meta.kind === "trip_builder_instalment") {
    // A payment the guest made on a Checkout page: "pay it all now", or the first instalment, or a missed one they paid by hand.
    const n = Number(meta.n) || 1;
    const items = readSchedule(row.pay_schedule);
    const item = items.find((i) => i.n === n);
    if (item ? item.status === "paid" : !!row.balance_paid_at) return; // this payment is already counted (webhook delivered twice)
    const paidNow = (session.amount_total ?? 0) / 100;
    if (item) { item.status = "paid"; item.paid_at = now.toISOString(); item.payment_intent = pi; item.last_error = null; item.retry_after = null; }
    const complete = items.length ? allPaid(items) : true;
    const firstBooking = String(row.status) !== "approved"; // read before we save: this payment is what books them
    const plan = (row.pay_plan as Plan | null) ?? (items.length > 1 ? "instalments" : "now");
    // Instalments are charged to the card the first payment was made with. A trip sent free has no deposit to have saved one, so take it from this payment.
    const needsCard = !row.stripe_payment_method_id && items.some((i) => i.how === "card" && i.status !== "paid");
    const card = needsCard ? await readCard(session, pi, null) : { customer: null, method: null };
    if (needsCard && !card.method) {
      await alertEwan(`Trip builder: no card saved for ${row.name}'s instalments · ${row.ref}`,
        `<p><strong>${esc(String(row.name))}</strong> (${row.ref}) paid the first instalment of ${esc(String(row.route ?? ""))}, but Stripe didn't give us a card to charge the rest to. The later payments can't be taken automatically: ask them to pay each one from their trip page, or take it from them yourself.</p>`, "trip_builder_no_card_ops");
    }
    const { error: uErr } = await sb.from("trip_builder_requests").update({
      ...(card.method ? { stripe_customer_id: card.customer, stripe_payment_method_id: card.method } : {}),
      status: "approved",
      pay_plan: plan,
      pay_schedule: items,
      plan_chosen_at: (row.plan_chosen_at as string | null) ?? now.toISOString(),
      balance_paid_at: complete ? now.toISOString() : null,
      balance_payment_intent: pi,
      guest_email: row.guest_email || guestEmail,
      updated_at: now.toISOString(),
    }).eq("ref", row.ref);
    if (uErr) throw new Error(`trip builder payment save: ${uErr.message}`);
    const paid = usd(paidNow);
    if (complete) {
      if (guestEmail) {
        const m = tripBuilderConfirmedEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", paid, statusUrl });
        await sendEmail({ to: guestEmail, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_confirmed" }).catch((e) => console.warn("trip builder confirmed email failed", e));
      }
      await sendEmail({
        to: EWAN, cc: teamCc(),
        subject: `Trip builder: ${row.name} paid ${paid} and is paid in full · ${row.ref}`,
        html: `<p><strong>${esc(String(row.name))}</strong> paid ${paid} for ${esc(String(row.route ?? ""))} (${row.ref}) and is paid in full. ${firstBooking ? "It's booked: make sure the beds are locked in." : ""}</p>`,
        templateName: "trip_builder_balance_ops",
      }).catch((e) => console.warn("trip builder balance ops email failed", e));
    } else if (firstBooking) {
      // First instalment in: they're booked, with the rest scheduled.
      await notifyBooked({ ...row, pay_plan: plan, plan_chosen_at: now.toISOString() } as Row, items, meta.origin || null, await signGuestKey(row.ref));
    } else {
      await sendEmail({
        to: EWAN, subject: `Trip builder: ${row.name} paid ${paid} (instalment ${n} of ${items.length}) · ${row.ref}`,
        html: `<p><strong>${esc(String(row.name))}</strong> paid ${paid} towards ${esc(String(row.route ?? ""))} (${row.ref}).</p>`, templateName: "trip_builder_instalment_ops",
      }).catch((e) => console.warn("trip builder instalment ops email failed", e));
    }
  }
}
