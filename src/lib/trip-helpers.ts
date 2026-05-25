import type { Departure } from "@/types/trip";

export const DEPOSIT_PER_SPOT = 99;
export const DEPOSIT_THRESHOLD_DAYS = 60;
export const HIDE_WITHIN_DAYS = 7;

export function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateIso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function isDepositEligible(dateIso: string): boolean {
  return daysUntil(dateIso) >= DEPOSIT_THRESHOLD_DAYS;
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function formatDateLong(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export function freeArrivalNightLine(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return `Free arrival night available ${d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}`;
}

export interface SpotBadge {
  label: string;
  tone: "green" | "amber" | "orange" | "red" | "grey";
  flame?: boolean;
}

export function spotBadge(n: number): SpotBadge {
  if (n <= 0) return { label: "Sold out · Join waitlist", tone: "grey" };
  if (n <= 2) return { label: `Last ${n} spot${n === 1 ? "" : "s"}`, tone: "red", flame: true };
  if (n <= 5) return { label: `Almost full — only ${n} left`, tone: "orange" };
  if (n <= 10) return { label: `Filling — ${n} spots left`, tone: "amber" };
  if (n <= 15) return { label: `${n} spots left`, tone: "green" };
  return { label: `Open · ${n} spots`, tone: "green" };
}

export function visibleDepartures(deps: Departure[], requestedSpots: number): Departure[] {
  return deps.filter(
    (d) =>
      d.bookable &&
      d.spotsRemaining >= requestedSpots &&
      daysUntil(d.date) >= HIDE_WITHIN_DAYS,
  );
}

export function paymentLine(dateIso: string, groupSize: number, price: number) {
  if (isDepositEligible(dateIso)) {
    return {
      type: "deposit" as const,
      label: `$${DEPOSIT_PER_SPOT * groupSize} deposit holds your spot`,
      amount: DEPOSIT_PER_SPOT * groupSize,
    };
  }
  const full = price * groupSize;
  return { type: "full" as const, label: `Pay in full · ${formatPrice(full)}`, amount: full };
}

export function allDeparturesUnder60Days(deps: Departure[]): boolean {
  if (!deps.length) return false;
  return deps.every((d) => !isDepositEligible(d.date));
}
