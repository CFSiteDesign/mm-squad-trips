// Trip builder: how a guest pays the rest once the crew has approved their trip (Ewan, 20 Oct 2026).
//
// Sending a trip is free (Ewan, 23 Oct 2026), so the crew sets the price once they have checked it, the guest picks how
// to pay it, and the plan follows the same rules as ALL IN bookings. (If a deposit was taken when the trip was sent,
// it counts towards the price and the card it was paid with carries on.)
//   now          pay the whole balance straight away
//   later        a deposit of LATER_DEPOSIT_USD per person now on Checkout (Ewan, 3 Nov 2026; the card it is paid with is saved), the rest charged automatically LATE_DAYS
//                before departure (a reminder goes first). With no deposit to take (one was paid when the trip was sent, or the deposit is switched off) it is one payment on the card.
//   instalments  only when departure is INSTALMENT_MIN_DAYS or more away: equal payments, the first one now (the card
//                it is paid with is saved), the rest charged to that card every INSTALMENT_EVERY_DAYS days, the last at
//                least LATE_DAYS before departure
// Pure functions only (no Stripe, no database), so every rule here is covered by trip-builder-pay.test.ts.

export const LATE_DAYS = 7;
export const INSTALMENT_MIN_DAYS = 60;
export const INSTALMENT_EVERY_DAYS = 30;
export const MAX_INSTALMENTS = 6;
export const MIN_INSTALMENT_USD = 20;
export const RETRY_DAYS = 2;
export const MAX_ATTEMPTS = 4;
/** US dollars per person taken today on "pay a week before I leave". It comes off the total. The secret TRIP_BUILDER_LATER_DEPOSIT_PER_PERSON changes it; 0 means no deposit. */
export const LATER_DEPOSIT_USD = 99;

export type Plan = "now" | "later" | "instalments";
export type ItemStatus = "pending" | "paid" | "failed" | "gave_up";
export type Item = {
  n: number; amount: number; due: string; how: "checkout" | "card"; status: ItemStatus;
  attempts: number; last_error: string | null; retry_after: string | null; paid_at: string | null; payment_intent: string | null; reminded: boolean;
};
export type Option = { plan: Plan; count: number; amount: number; items: { amount: number; due: string }[] };

const DAY = 86_400_000;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const parseDay = (s: string | null | undefined): Date | null => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);
export function addDays(iso: string, n: number): string { return isoDay(new Date(parseDay(iso)!.getTime() + n * DAY)); }
/** Whole days from `now` (UTC date) to a departure date. Negative once it has passed. */
export function daysUntil(start: string | null | undefined, now = new Date()): number | null {
  const d = parseDay(start); if (!d) return null;
  return Math.round((d.getTime() - parseDay(isoDay(now))!.getTime()) / DAY);
}

/** Equal parts in whole cents; any odd cents go on the last payment so the parts always add up to the total. */
export function splitCents(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n), out = Array(n).fill(base) as number[];
  out[n - 1] += totalCents - base * n;
  return out;
}

/** How many instalments a guest can have: first one now, one every 30 days, the last at least 7 days before they leave. */
export function instalmentCount(days: number | null, balance: number): number {
  if (days == null || days < INSTALMENT_MIN_DAYS) return 0;
  const byDate = Math.floor((days - LATE_DAYS) / INSTALMENT_EVERY_DAYS) + 1;
  const byAmount = Math.floor(balance / MIN_INSTALMENT_USD);
  const n = Math.min(MAX_INSTALMENTS, byDate, byAmount);
  return n >= 2 ? n : 0;
}

/** The per-person deposit from the secret: unset or a typo means the normal LATER_DEPOSIT_USD, 0 switches it off, otherwise whole dollars up to 1000. */
export function parseLaterDeposit(v: unknown): number {
  const t = String(v ?? "").trim(), n = Number(t);
  return t !== "" && Number.isInteger(n) && n >= 0 && n <= 1000 ? n : LATER_DEPOSIT_USD;
}
/** The deposit a "later" plan takes today for this trip: per person, and nothing if a deposit was already paid when the trip was sent. */
export function laterDepositTotal(perPerson: number, row: { deposit_paid_at?: unknown; party_size?: unknown }): number {
  return row.deposit_paid_at ? 0 : perPerson * Math.max(1, Math.round(Number(row.party_size) || 1));
}

/** The schedule for a plan. Item 1 of "now" and "instalments", and the deposit of "later", is paid on a Stripe Checkout page today; later items are charged to the saved card. */
export function buildSchedule(plan: Plan, balance: number, start: string | null, now = new Date(), laterDeposit = 0): Item[] {
  const today = isoDay(now), cents = Math.round(balance * 100);
  const mk = (n: number, c: number, due: string, how: Item["how"]): Item => ({ n, amount: c / 100, due, how, status: "pending", attempts: 0, last_error: null, retry_after: null, paid_at: null, payment_intent: null, reminded: false });
  if (plan === "now") return [mk(1, cents, today, "checkout")];
  if (plan === "later") {
    const due = addDays(start!, -LATE_DAYS), dep = Math.round(laterDeposit * 100);
    return dep > 0 ? [mk(1, dep, today, "checkout"), mk(2, cents - dep, due, "card")] : [mk(1, cents, due, "card")];
  }
  const n = instalmentCount(daysUntil(start, now), balance);
  return splitCents(cents, n).map((c, i) => mk(i + 1, c, addDays(today, i * INSTALMENT_EVERY_DAYS), i === 0 ? "checkout" : "card"));
}

/** What this guest can choose. "later" and "instalments" need a departure date far enough away, and "later" needs at least $1 left after its deposit. The card they are charged is saved as part of choosing (or is the one already on file). */
export function payOptions(o: { balance: number; start: string | null; now?: Date; laterDeposit?: number }): Option[] {
  const now = o.now ?? new Date(), days = daysUntil(o.start, now), dep = o.laterDeposit ?? 0, out: Option[] = [];
  if (!(o.balance >= 1)) return out;
  const view = (plan: Plan): Option => { const items = buildSchedule(plan, o.balance, o.start, now, dep); return { plan, count: items.length, amount: o.balance, items: items.map((i) => ({ amount: i.amount, due: i.due })) }; };
  out.push(view("now"));
  if (days != null && days > LATE_DAYS && o.balance - dep >= 1) out.push(view("later"));
  if (instalmentCount(days, o.balance) >= 2) out.push(view("instalments"));
  return out;
}

/** Does money paid on a Checkout page match what is scheduled? Not if the page was left open while the plan changed underneath it (they chose again, the crew reset the price, the guest edited the trip). */
export function paymentFits(kind: string, item: Item | undefined, paid: number, balance: unknown): boolean {
  const expected = item ? item.amount : kind === "trip_builder_balance" ? Number(balance) : null;
  return expected != null && Math.abs(paid - expected) < 0.005;
}

export const allPaid = (items: Item[]) => items.length > 0 && items.every((i) => i.status === "paid");
export const paidSoFar = (items: Item[]) => Math.round(items.filter((i) => i.status === "paid").reduce((a, i) => a + i.amount * 100, 0)) / 100;

/** Card payments that are due today (or earlier) and not waiting for a retry date. */
export function dueNow(items: Item[], now = new Date()): Item[] {
  const today = isoDay(now);
  return items.filter((i) => i.how === "card" && (i.status === "pending" || i.status === "failed") && i.due <= today && (!i.retry_after || i.retry_after <= now.toISOString()));
}
/** Card payments due in exactly `ahead` days that nobody has been reminded about yet. */
export function needReminder(items: Item[], ahead = 3, now = new Date()): Item[] {
  const when = addDays(isoDay(now), ahead);
  return items.filter((i) => i.how === "card" && i.status === "pending" && !i.reminded && i.due === when);
}
/** Read a saved schedule defensively (it lives in a jsonb column). */
export function readSchedule(v: unknown): Item[] {
  if (!Array.isArray(v)) return [];
  return v.map((x, k) => {
    const r = (x ?? {}) as Record<string, unknown>;
    return {
      n: Number(r.n) || k + 1, amount: Number(r.amount) || 0, due: parseDay(String(r.due)) ? String(r.due) : "", how: r.how === "checkout" ? "checkout" : "card",
      status: (["pending", "paid", "failed", "gave_up"].includes(String(r.status)) ? r.status : "pending") as ItemStatus, attempts: Number(r.attempts) || 0,
      last_error: r.last_error ? String(r.last_error).slice(0, 300) : null, retry_after: r.retry_after ? String(r.retry_after) : null, paid_at: r.paid_at ? String(r.paid_at) : null,
      payment_intent: r.payment_intent ? String(r.payment_intent) : null, reminded: r.reminded === true,
    };
  });
}
