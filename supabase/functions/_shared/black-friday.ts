// Black Friday 2026 on ALL IN trips (Lexie, 3-4 Nov 2026). Switches itself on and off by date, on every
// bookable departure: $0 deposit (card saved, the balance is charged 7 days before departure as usual) and
// money off per spot. Thailand has no ALL IN trip yet, so it stays out. Creator codes still work on top; other discount codes don't.
// Pure functions only, covered by black-friday.test.ts. The site imports this same file (src/lib/black-friday.ts), so prices can't drift.

/** Fri 27 Nov 2026 00:00 Bali time (UTC+8). */
export const SALE_START_MS = Date.UTC(2026, 10, 26, 16, 0, 0);
/** The first moment after Sun 29 Nov 2026 23:59 Bali time. */
export const SALE_END_MS = Date.UTC(2026, 10, 29, 16, 0, 0);

const OFF_PER_SPOT: Record<string, number> = {
  laos: 200,
  indonesia: 200,
  cambodia: 200,
  vietnam: 200,
  "vietnam-7": 100,
  "indonesia-7": 100,
};

/** Dollars off per spot right now, 0 when the sale isn't on for this trip. A preview runs it early, never after it ends. */
export function saleOffPerSpot(slug: string, now = Date.now(), preview = false): number {
  const live = now < SALE_END_MS && (preview || now >= SALE_START_MS);
  return live ? OFF_PER_SPOT[slug] ?? 0 : 0;
}

/** The server's check on a preview key. No key set means no preview at all. */
export function previewAllowed(given: unknown, key: string | undefined): boolean {
  return Boolean(key) && given === key;
}
