// Black Friday 2026 on ALL IN trips (Lexie, 3-5 Nov 2026). Switches itself on and off by date, on departures
// from 30 Nov: $0 deposit (card saved, the balance is charged 7 days before departure as usual) and money off
// per spot. Thailand has no ALL IN trip yet, so it stays out. Creator codes still work on top; other discount codes don't.
// Pure functions only, covered by black-friday.test.ts. The site imports this same file (src/lib/black-friday.ts), so prices can't drift.

/** Thu 26 Nov 2026 12:00 Bali time (UTC+8): opens for people holding the early access link. */
export const EARLY_ACCESS_START_MS = Date.UTC(2026, 10, 26, 4, 0, 0);
/** Fri 27 Nov 2026 00:00 Bali time (UTC+8). */
export const SALE_START_MS = Date.UTC(2026, 10, 26, 16, 0, 0);
/** The first moment after Sun 29 Nov 2026 23:59 Bali time. */
export const SALE_END_MS = Date.UTC(2026, 10, 29, 16, 0, 0);
/** Departures before this aren't in the sale: there's no time to block rooms by hand (T&Cs 2.4, Lexie 5 Nov 2026). */
export const FIRST_SALE_DEPARTURE = "2026-11-30";
/** The sale's published terms (Lexie, 4 Nov 2026). */
export const SALE_TERMS_URL = "https://madmonkeyhostels.com/terms-and-conditions/#all-in-black-friday-2026";

// Lexie's tiers, by the price of the trip (T&Cs 3.1): over $500 is $200 off, $500 or less is $100 off.
const OFF_PER_SPOT: Record<string, number> = {
  indonesia: 200,
  cambodia: 200,
  vietnam: 200,
  laos: 100,
  "vietnam-7": 100,
  "indonesia-7": 100,
};

/** "early" is the link Klaviyo sends to the sign-up list. "preview" is our test link, which works before that too. */
export type SaleAccess = "early" | "preview" | null;

// SHA-256 of each link's key, because this repo is public. The keys themselves only live in the links.
const ACCESS_KEY_HASHES: Record<string, SaleAccess> = {
  b8b9a0d45505f35fbc7572dd33983e0bdfff8fe04d0a539fa67980c9179ffad0: "early",
  "00bbe8321fc874e00d440c76563e930028ed05081d7a384e697e63668b64f890": "preview",
};

/** Which link this key belongs to, if any. */
export async function saleAccessFor(key: unknown, hashes: Record<string, SaleAccess> = ACCESS_KEY_HASHES): Promise<SaleAccess> {
  if (typeof key !== "string" || !key || key.length > 100) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashes[hex] ?? null;
}

/** Dollars off per spot right now, 0 when the sale isn't on for this trip and departure. Nothing runs it after it ends. */
export function saleOffPerSpot(slug: string, now = Date.now(), access: SaleAccess = null, departureDate?: string): number {
  const opensAt = access === "preview" ? 0 : access === "early" ? EARLY_ACCESS_START_MS : SALE_START_MS;
  if (now < opensAt || now >= SALE_END_MS) return 0;
  if (departureDate && departureDate < FIRST_SALE_DEPARTURE) return 0;
  return OFF_PER_SPOT[slug] ?? 0;
}
