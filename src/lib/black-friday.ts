// The site's side of the Black Friday rule (supabase/functions/_shared/black-friday.ts, shared so the two can't drift).
// What it decides here is display only: create-checkout-session works the real price out again on the server.
import { saleOffPerSpot } from "../../supabase/functions/_shared/black-friday";

export { SALE_END_MS } from "../../supabase/functions/_shared/black-friday";

const STORE_KEY = "mm_black_friday_preview";

/** Set by opening any page with ?bfpreview=<key>, kept for the tab. The server decides whether the key is any good. */
export function salePreviewKey(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("bfpreview");
    if (fromUrl) sessionStorage.setItem(STORE_KEY, fromUrl);
    return fromUrl || sessionStorage.getItem(STORE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** Dollars off per spot on this trip right now, 0 outside the sale. */
export function saleOff(slug: string): number {
  return saleOffPerSpot(slug, Date.now(), Boolean(salePreviewKey()));
}

/** What holds a spot on this trip right now. Every listed trip is in the sale, so the home page asks about any one of them. */
export function depositText(slug = "vietnam"): string {
  return saleOff(slug) > 0 ? "$0" : "$99";
}
