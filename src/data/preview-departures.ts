// Weekly departures for the Aug 2026 preview.
//
// Kyle's note: "it should be super easy for anyone to just select the next
// departure date. This should leave every week at whatever the agreed 'day'
// is." The database only holds a handful of scattered dates per trip, so the
// preview fills in the weeks between them.
//
// PREVIEW ONLY. Real rows are passed through untouched — same id, spots and
// price, booked through their departure id. Filled-in weeks are demo data and
// book as a custom date on the trip's start weekday. Nothing here is written
// back, so the live site is unaffected; seeding the real weekly schedule is a
// database job for whoever ships this.
import { getLocalPrice } from "@/data/pricingCalendar";
import type { Departure, Trip } from "@/types/trip";

/** Weeks of departures the preview lists ahead of the first bookable one. */
const WEEKS_AHEAD = 16;
/** Days between today and the earliest departure offered. */
const LEAD_DAYS = 5;

export type PreviewDeparture = Departure & {
  /** True when the preview filled this week in rather than reading it from the
   *  database. Governs which checkout path the row uses. */
  generated: boolean;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
};

/** Stable 4–12 so the demo list doesn't read as templated. Keyed off the date
 *  so a row shows the same number on every render. */
function demoSpots(date: string) {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return 4 + (h % 9);
}

function startWeekdayOf(trip: Trip): number {
  if (trip.startWeekday !== null && trip.startWeekday !== undefined) return Number(trip.startWeekday);
  const first = (trip.departures ?? [])[0];
  return first ? new Date(first.date + "T00:00:00Z").getUTCDay() : 6;
}

/**
 * Every week on the trip's start weekday, from the first bookable one, with the
 * real database departures merged in where the dates line up. Real rows outside
 * the generated window are kept too, so nothing already on sale disappears.
 */
export function previewDepartures(trip: Trip, now = new Date()): PreviewDeparture[] {
  const weekday = startWeekdayOf(trip);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const real = new Map<string, Departure>();
  for (const d of trip.departures ?? []) real.set(d.date, d);

  let first = addDays(today, LEAD_DAYS);
  while (first.getUTCDay() !== weekday) first = addDays(first, 1);

  const out: PreviewDeparture[] = [];
  const seen = new Set<string>();

  for (let w = 0; w < WEEKS_AHEAD; w++) {
    const date = iso(addDays(first, w * 7));
    seen.add(date);
    const hit = real.get(date);
    if (hit) {
      out.push({ ...hit, generated: false });
      continue;
    }
    const local = getLocalPrice(trip.slug, date);
    out.push({
      id: `demo-${date}`,
      departureId: `${trip.code}-${date}`,
      date,
      spotsRemaining: demoSpots(date),
      bookable: true,
      price: local?.price ?? trip.defaultPrice,
      strikethrough: local?.strikethrough ?? trip.defaultStrikethrough ?? null,
      generated: true,
    });
  }

  // Anything real and still upcoming that fell outside the window.
  const todayIso = iso(today);
  for (const d of trip.departures ?? []) {
    if (d.date >= todayIso && !seen.has(d.date)) out.push({ ...d, generated: false });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** The one to put in front of people: soonest departure with spots on it. */
export function nextDeparture(rows: PreviewDeparture[]): PreviewDeparture | null {
  return rows.find((d) => d.bookable && d.spotsRemaining > 0) ?? rows[0] ?? null;
}
