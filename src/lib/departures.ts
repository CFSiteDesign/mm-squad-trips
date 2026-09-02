import type { Departure } from "@/types/trip";

/** Soonest departure someone can actually book. */
export function nextDeparture(rows: Departure[]): Departure | null {
  return rows.find((d) => d.bookable && d.spotsRemaining > 0) ?? null;
}
