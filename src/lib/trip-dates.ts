// Date labels shared by the trip page's booking section and the advisor
// checkout page. All UTC, since departure dates are calendar dates.
import { tripNights } from "@/data/trips";

export const monthKey = (iso: string) => iso.slice(0, 7);

export const monthLabel = (k: string) =>
  new Date(k + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * The day a trip that starts on `iso` ends: the departure morning, `nights`
 * later. Not `days - 1`. Every itinerary's last labelled day is the departure
 * morning and the "N days" copy does not count it, so a 7-day trip runs Wed to
 * the following Wed. Kyle caught the old maths showing Wed to Tue (4 Sep 2026).
 */
export function endDate(iso: string, nights: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.max(0, nights));
  return d.toISOString().slice(0, 10);
}

export const tripEndDate = (iso: string, trip: { slug: string; days: number }) => endDate(iso, tripNights(trip));
