// The site's side of the Black Friday rule (supabase/functions/_shared/black-friday.ts, shared so the two can't drift).
// What it decides here is display only: create-checkout-session works the real price out again on the server.
import { EARLY_ACCESS_START_MS, saleAccessFor, saleOffPerSpot, type SaleAccess } from "../../supabase/functions/_shared/black-friday";

export { SALE_END_MS, SALE_TERMS_URL } from "../../supabase/functions/_shared/black-friday";

const STORE_KEY = "mm_black_friday_access";

let access: SaleAccess = null;
let accessKey: string | undefined;

/** Runs before the app renders. Opening any page with ?early=<key> unlocks the sale on this device, so they can come back to it later. */
export async function initSaleAccess(hashes?: Record<string, SaleAccess>): Promise<void> {
  access = null;
  accessKey = undefined;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("early");
    for (const key of [fromUrl, localStorage.getItem(STORE_KEY)]) {
      const found = await saleAccessFor(key, hashes);
      if (found) {
        access = found;
        accessKey = key as string;
        localStorage.setItem(STORE_KEY, accessKey);
        return;
      }
    }
  } catch {
    // Blocked storage or no crypto: they see the same prices as everyone else.
  }
}

/** Sent to the server, which checks it again. */
export function saleKey(): string | undefined {
  return accessKey;
}

/** They've got the early access link, but it isn't open yet. */
export function earlyAccessWaiting(): boolean {
  return access === "early" && Date.now() < EARLY_ACCESS_START_MS;
}

/** Dollars off per spot right now, 0 outside the sale. Pass the date when the departure is known. */
export function saleOff(slug: string, departureDate?: string): number {
  return saleOffPerSpot(slug, Date.now(), access, departureDate);
}

/** What holds a spot on this trip right now. Every listed trip is in the sale, so the home page asks about any one of them. */
export function depositText(slug = "vietnam"): string {
  return saleOff(slug) > 0 ? "$0" : "$99";
}
