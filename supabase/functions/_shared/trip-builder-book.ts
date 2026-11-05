// What actually gets booked when a trip builder trip is paid (Ewan, 4 Nov 2026). Taking the money books nothing by itself: the ALL IN part goes into
// `bookings` here, the same as an ALL IN checkout, so the spaces stay right and the ALL IN team see the guest. Beds and tours are booked by hand from the "to book" list.
// toBookList and allInPaidPerSpot are pure and covered by trip-builder-book.test.ts.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { cancelBookingValues } from "./booking-cancel.ts";
import { APP_URL, bookingOpsNotificationEmail, OPS_NOTIFY_EMAILS, opsCcForTrip, sendEmail } from "./email.ts";
import { readSummary, type Stop, type Summary } from "./trip-builder-crew.ts";
import { addDays, cancelUnpaid, type Item, paidSoFar, readSchedule } from "./trip-builder-pay.ts";

export type ToBookItem = { key: string; kind: "allin" | "bed" | "tour" | "travel"; text: string };

/** The builder's name for an ALL IN, where it differs from the slug on the ALL IN site. */
const ALL_IN_SLUG: Record<string, string> = { loop: "vietnam-7", "gili-lombok": "indonesia-7" };
export const allInSlug = (id: string) => ALL_IN_SLUG[id] ?? id;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function day(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : null;
  return d ? `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : "";
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const join = (...parts: string[]) => parts.filter(Boolean).join(" · ");

/** Every part of the trip that needs booking, ALL INs first. Flights are never on it: they aren't ours to book. Keys stay the same when the list is rebuilt, so ticks in Admin stick. */
export function toBookList(sum: Summary | null, people: number): ToBookItem[] {
  if (!sum) return [];
  const who = `${people} ${people === 1 ? "person" : "people"}`;
  const beds = `${people} ${people === 1 ? "bed" : "beds"}`;
  const allIns: ToBookItem[] = [], rest: ToBookItem[] = [];
  for (const s of sum.stops) {
    if (s.kind === "allin") {
      allIns.push({ key: `allin:${allInSlug(s.id || slugify(s.name))}:${s.from}`, kind: "allin", text: join(s.name, s.from ? `${day(s.from)} to ${day(s.to)}` : "no date yet", who) });
    } else if (s.nights > 0) {
      const name = s.partner ? `${s.name} (partner hostel)` : `Mad Monkey ${s.name}`;
      rest.push({ key: `bed:${slugify(s.name)}:${s.from}`, kind: "bed", text: join(name, `${s.nights} ${s.nights === 1 ? "night" : "nights"}`, s.from ? `in ${day(s.from)}, out ${day(s.to)}` : "", beds) });
    }
    for (const t of s.tours) {
      rest.push({
        key: `tour:${slugify(t.name)}:${t.date || t.day}`, kind: "tour",
        text: join(t.name, t.date ? day(t.date) : t.day ? `day ${t.day}` : "", who, t.payOnDay ? "they pay on the day" : "", t.fits ? "" : "NO ROOM on that day, check it"),
      });
    }
    if (s.next && !/flight|fly|plane/i.test(s.next.mode)) {
      rest.push({ key: `travel:${slugify(s.next.to)}:${s.next.date}`, kind: "travel", text: join(`${s.next.mode} to ${s.next.to}`, s.next.date ? day(s.next.date) : "", who) });
    }
  }
  return [...allIns, ...rest];
}

const sessionIdFor = (ref: string, slug: string, date: string) => `tb:${ref}:${slug}:${date}`;

/** What they have paid so far, as dollars per spot for each ALL IN in the trip, ALL INs first so the ALL IN team see the truth. */
export function allInPaidPerSpot(stops: Pick<Stop, "usd">[], paidTotal: number, people: number): number[] {
  let left = Math.max(0, paidTotal) / Math.max(1, people);
  return stops.map((s) => {
    const part = Math.min(s.usd, left);
    left -= part;
    return Math.round(part * 100) / 100;
  });
}

type Row = Record<string, unknown>;
const paidTotal = (row: Row, items: Item[]) => {
  const deposit = row.deposit_paid_at ? Number(row.deposit_amount) || 0 : 0;
  // No schedule: "paid another way", or paid in one go before schedules existed.
  return items.length ? deposit + paidSoFar(items) : (Number(row.balance_amount) || 0) + deposit;
};

export type AllInResult = { key: string; name: string; added: boolean; already?: boolean; problem?: string };

/**
 * Puts each ALL IN in a booked trip into `bookings`, or brings the money on it up to date if it is there already. Safe to call on every payment.
 * Never takes a spot that isn't there and never throws: anything it can't do comes back as a problem for the crew's list, because the money is already in.
 */
export async function syncAllInBookings(sb: SupabaseClient, row: Row): Promise<AllInResult[]> {
  const ref = String(row.ref);
  const stops = (readSummary(row.payload)?.stops ?? []).filter((s) => s.kind === "allin");
  const people = Math.max(1, Number(row.party_size) || 1);
  const items = readSchedule(row.pay_schedule);
  const paid = allInPaidPerSpot(stops, paidTotal(row, items), people);
  const results: AllInResult[] = [];

  for (const [i, s] of stops.entries()) {
    const slug = allInSlug(s.id || slugify(s.name));
    const key = `allin:${slug}:${s.from}`;
    const say = (problem: string) => results.push({ key, name: s.name, added: false, problem });
    try {
      if (!s.from) { say("The trip has no start date, so it isn't on a departure."); continue; }
      const sessionId = sessionIdFor(ref, slug, s.from);
      const fullyPaid = paid[i] >= s.usd;
      const money = { amount_paid: paid[i], payment_type: fullyPaid ? "Full" : "Deposit" };
      const { data: there } = await sb.from("bookings").select("id").eq("stripe_session_id", sessionId).limit(1);
      if (there?.length) {
        await sb.from("bookings").update(money).eq("stripe_session_id", sessionId).neq("status", "Cancelled");
        results.push({ key, name: s.name, added: true, already: true });
        continue;
      }
      const { data: trip } = await sb.from("trips").select("id,name").eq("slug", slug).maybeSingle();
      if (!trip) { say(`There is no ALL IN trip "${slug}" on the site.`); continue; }
      const { data: dep } = await sb.from("departures").select("id,departure_code,spots_remaining,total_spots,status").eq("trip_id", trip.id).eq("departure_date", s.from).maybeSingle();
      if (!dep) { say(`There is no departure on ${day(s.from)}.`); continue; }
      if (dep.status === "cancelled") { say(`The ${day(s.from)} departure is cancelled.`); continue; }
      const spots = dep.spots_remaining ?? dep.total_spots ?? 0;
      if (spots < people) { say(`The ${day(s.from)} departure only has ${spots} ${spots === 1 ? "spot" : "spots"} left, and this needs ${people}.`); continue; }

      const guest = (row.guest_email as string | null) || (row.email as string | null) || null;
      const base = {
        trip_id: trip.id, departure_id: dep.id, group_id: people > 1 ? ref : null, booking_ref: ref, group_size: people, lead_name: row.name ?? null, lead_email: guest,
        original_price: s.usd, discount_amount: 0, final_price: s.usd, balance_amount: 0, balance_status: "not_required", status: "Confirmed", stripe_session_id: sessionId, ...money,
      };
      const rows = Array.from({ length: people }, (_, n) => n === 0
        // Solo here means it never gets the under-5 heads-up with its "refund your deposit": this guest paid for a whole trip through the crew.
        ? { ...base, booking_type: people === 1 ? "Solo" : "Group lead", spot_number: 1, lead_phone: row.whatsapp ?? null, lead_country: row.from_place ?? null, lead_solo: true, lead_source: `Trip builder ${ref}`, traveller_mode: people === 1 ? "independent" : null }
        : { ...base, booking_type: "Group member", spot_number: n + 1 });
      const { error } = await sb.from("bookings").insert(rows);
      if (error) { say(`Couldn't add it: ${error.message}`); continue; }
      results.push({ key, name: s.name, added: true });

      const ops = bookingOpsNotificationEmail({
        leadName: String(row.name ?? "Unknown"), leadEmail: guest ?? "", leadPhone: (row.whatsapp as string | null) ?? undefined,
        tripName: `${s.name} (trip builder ${ref})`, departureDate: s.from, spots: people, amount: `$${(paid[i] * people).toFixed(2)} USD through the trip builder`,
        bookingRef: ref, bookingUrl: `${APP_URL}/admin`, bookingType: people === 1 ? "solo" : "group",
      });
      const cc = opsCcForTrip(s.name, slug);
      await sendEmail({ to: OPS_NOTIFY_EMAILS, cc: cc.length ? cc : undefined, subject: ops.subject, html: ops.html, templateName: "booking_ops_notification" }).catch((e) => console.warn("trip builder ALL IN ops email failed", e));
    } catch (e) {
      say(`Couldn't add it: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return results;
}

/**
 * The whole trip is off, whichever screen it was closed from: payments still to come stop, every ALL IN spot goes back on sale and the ALL IN emails stop.
 * Refunds stay a person's call in Stripe, and nobody is emailed.
 */
export async function closeTrip(sb: SupabaseClient, row: Row, note?: string): Promise<{ cancelled: number; count: number; paid: number }> {
  const c = cancelUnpaid(readSchedule(row.pay_schedule));
  const { error: bErr } = await sb.from("bookings").update(cancelBookingValues("not_required")).like("stripe_session_id", `tb:${row.ref}:%`);
  if (bErr) throw new Error(`couldn't cancel the ALL IN booking: ${bErr.message}`);
  const { error } = await sb.from("trip_builder_requests").update({ status: "declined", pay_schedule: c.items, ...(note !== undefined ? { crew_note: note || null } : {}), updated_at: new Date().toISOString() }).eq("ref", row.ref);
  if (error) throw new Error(error.message);
  return { cancelled: c.amount, count: c.count, paid: paidSoFar(c.items) };
}

/** The ref of a trip builder booking from its session id, or null for an ordinary ALL IN checkout. */
export const tripRefFromSession = (session: unknown) => /^tb:(MM-[A-Z0-9]{6}):/.exec(String(session ?? ""))?.[1] ?? null;

const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * A booked trip with every date moved by the same number of days, and the payments still to come moved with it. Nothing is saved here.
 * A later payment that lands in the past is simply taken on the next daily run, the same as any payment that's due.
 */
export function movedTrip(row: Row, newStart: string): { days: number; patch: Record<string, unknown>; nextPayment: Item | null } {
  const days = Math.round((Date.parse(`${newStart}T00:00:00Z`) - Date.parse(`${row.start_date}T00:00:00Z`)) / 86_400_000);
  const shift = (o: Record<string, unknown> | null | undefined, k: string) => { if (o && isIso(o[k])) o[k] = addDays(o[k] as string, days); };
  const payload = structuredClone((row.payload ?? {}) as Record<string, unknown>);
  const sum = payload.summary as Record<string, unknown> | undefined;
  if (sum) {
    shift(sum, "start"); shift(sum, "end");
    shift((sum.stage as Record<string, unknown> | null | undefined)?.arrival as Record<string, unknown> | undefined, "date");
    for (const s of (Array.isArray(sum.stops) ? sum.stops : []) as Record<string, unknown>[]) {
      shift(s, "from"); shift(s, "to"); shift(s.next as Record<string, unknown> | null, "date");
      for (const t of (Array.isArray(s.tours) ? s.tours : []) as Record<string, unknown>[]) shift(t, "date");
    }
  }
  const withDate = (u: unknown) => (typeof u === "string" ? u.replace(/([?&#/~]|^)d=\d{4}-\d{2}-\d{2}/, `$1d=${newStart}`) : u);
  const trip = payload.trip as Record<string, unknown> | undefined;
  if (trip) { trip.start = newStart; trip.link = withDate(trip.link); trip.state = withDate(trip.state); }
  // Paid and given-up items are history. A failed one keeps its retry, but no earlier than its new date.
  const items = readSchedule(row.pay_schedule).map((i) => {
    if (i.status !== "pending" && i.status !== "failed") return i;
    const due = addDays(i.due, days);
    return { ...i, due, reminded: false, retry_after: i.retry_after && i.retry_after.slice(0, 10) < due ? `${due}T14:00:00.000Z` : i.retry_after };
  });
  const nextPayment = items.filter((i) => i.status === "pending" || i.status === "failed").sort((a, b) => a.due.localeCompare(b.due))[0] ?? null;
  return {
    days, nextPayment,
    patch: {
      start_date: newStart, payload, trip_link: withDate(row.trip_link), pay_schedule: items,
      itinerary: `DATES MOVED: this trip now starts ${day(newStart)} (it was ${day(String(row.start_date))}). The dates below are from before the move.\n\n${row.itinerary ?? ""}`,
    },
  };
}

/** Moves every ALL IN in a booked trip to the departure on its new date. Checks them all before it moves any, so a trip never ends up half moved. */
export async function moveAllInBookings(sb: SupabaseClient, row: Row, days: number): Promise<{ problem?: string; moved: { name: string; slug: string; from: string; to: string }[] }> {
  const ref = String(row.ref);
  const people = Math.max(1, Number(row.party_size) || 1);
  const moves: { name: string; slug: string; from: string; to: string; departureId: string; there: boolean }[] = [];
  for (const s of (readSummary(row.payload)?.stops ?? []).filter((x) => x.kind === "allin" && x.from)) {
    const slug = allInSlug(s.id || slugify(s.name));
    const to = addDays(s.from, days);
    const { data: trip } = await sb.from("trips").select("id").eq("slug", slug).maybeSingle();
    if (!trip) return { problem: `There is no ALL IN trip "${slug}" on the site.`, moved: [] };
    const { data: dep } = await sb.from("departures").select("id,spots_remaining,total_spots,status,bookable").eq("trip_id", trip.id).eq("departure_date", to).maybeSingle();
    if (!dep || dep.status === "cancelled" || dep.bookable !== true) return { problem: `${s.name} has no departure on ${day(to)}, so nothing has moved. Pick a date it runs on.`, moved: [] };
    const spots = dep.spots_remaining ?? dep.total_spots ?? 0;
    if (spots < people) return { problem: `${s.name} on ${day(to)} only has ${spots} ${spots === 1 ? "spot" : "spots"} left and this needs ${people}, so nothing has moved.`, moved: [] };
    const { data: there } = await sb.from("bookings").select("id").eq("stripe_session_id", sessionIdFor(ref, slug, s.from)).neq("status", "Cancelled").limit(1);
    moves.push({ name: s.name, slug, from: s.from, to, departureId: dep.id, there: !!there?.length });
  }
  for (const m of moves.filter((x) => x.there)) {
    // The reminder stamps go too, so the new date gets its own pre-departure emails. The counters trigger puts the spots right on both departures.
    const { error } = await sb.from("bookings").update({ departure_id: m.departureId, stripe_session_id: sessionIdFor(ref, m.slug, m.to), reminder_7d_sent_at: null, underfill_notice_sent_at: null }).eq("stripe_session_id", sessionIdFor(ref, m.slug, m.from));
    if (error) return { problem: `Couldn't move ${m.name}: ${error.message}`, moved: [] };
  }
  return { moved: moves.filter((x) => x.there).map(({ name, slug, from, to }) => ({ name, slug, from, to })) };
}

/** Every trip builder ALL IN in `bookings` right now, by its session id. */
export async function allInKeysBooked(sb: SupabaseClient): Promise<Set<string>> {
  const { data } = await sb.from("bookings").select("stripe_session_id").like("stripe_session_id", "tb:%").eq("spot_number", 1).eq("status", "Confirmed").limit(2000);
  return new Set((data ?? []).map((r) => String(r.stripe_session_id)));
}
export const allInSessionForKey = (ref: string, key: string) => {
  const [, slug, date] = key.split(":");
  return sessionIdFor(ref, slug, date);
};
