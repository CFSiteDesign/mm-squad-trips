// Search metadata for the ALL IN pages, written once. The pages use the titles
// on client-side navigation; the build step (src/seo/prerender.ts, run from
// vite.config.ts) prints the same titles, descriptions and canonicals into the
// HTML each route ships, so crawlers get them without running JavaScript.
import { TRIPS } from "@/data/trips";

/** Production lives under the main Mad Monkey domain; the lovable.app copy is a mirror. */
export const SITE_ORIGIN = "https://madmonkeyhostels.com";
export const ALLIN_URL = `${SITE_ORIGIN}/all-in-trips`;
export const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/tzR2PpIkesUVrzz7XGJoD3wIFsL2/social-images/social-1779854602939-mmsquad.webp";

export type SeoSlug = "indonesia" | "indonesia-7" | "vietnam" | "vietnam-7" | "cambodia" | "thailand";

/** The home page's trip cards, in order. Thailand is link-only and stays out. */
export const LISTED_SLUGS = ["indonesia", "indonesia-7", "vietnam", "vietnam-7", "cambodia"] as const;

export const pageUrl = (slug?: string) => (slug ? `${ALLIN_URL}/${slug}` : ALLIN_URL);
export const priceOf = (slug: string) => TRIPS.find((t) => t.slug === slug)?.price ?? 0;

export const HOME_SEO = {
  title: "ALL IN Backpacker Trips in Southeast Asia | Mad Monkey Hostels",
  description:
    "7 to 14-day backpacker trips through Vietnam, Indonesia and Cambodia. Mad Monkey hostel beds, transport and activities sorted. A $99 deposit holds your spot.",
};

type TripSeo = { title: string; description: string; noindex?: boolean };

const sorted = "Mad Monkey hostels, transport and activities sorted";
const deposit = "A $99 deposit holds your spot.";

export const TRIP_SEO: Record<SeoSlug, TripSeo> = {
  indonesia: {
    title: "Indonesia 12-Day Backpacker Trip: Bali to Lombok | Mad Monkey",
    description: `12 days from Uluwatu to Kuta Lombok: Mount Batur sunrise, Nusa Penida snorkelling, Gili T and Lombok surf camp. ${sorted}, from $${priceOf("indonesia")}. ${deposit}`,
  },
  "indonesia-7": {
    title: "Gili T and Lombok 7-Day Backpacker Trip | Mad Monkey ALL IN",
    description: `7 days on Gili Trawangan and Lombok: island bike tours, boat parties, snorkelling and surf camp. ${sorted}, from $${priceOf("indonesia-7")}. ${deposit}`,
  },
  vietnam: {
    title: "Vietnam 14-Day Backpacker Trip: Hanoi to Hoi An | Mad Monkey",
    description: `14 days from Hanoi to Hoi An: a Ha Long Bay cruise, Ninh Binh, the Ha Giang Loop and Hoi An nights. ${sorted}, from $${priceOf("vietnam")}. ${deposit}`,
  },
  "vietnam-7": {
    title: "Ha Giang Loop 7-Day Backpacker Trip from Hanoi | Mad Monkey",
    description: `7 days from Hanoi to the Ha Giang Loop: street food, a 4-day mountain ride and village homestays. ${sorted}, from $${priceOf("vietnam-7")}. ${deposit}`,
  },
  cambodia: {
    title: "Cambodia 14-Day Backpacker Trip: Angkor to Koh Rong | Mad Monkey",
    description: `14 days from Phnom Penh to Koh Sdach: Angkor Wat, Koh Rong beach parties and island chill. ${sorted}, from $${priceOf("cambodia")}. ${deposit}`,
  },
  // Link-only (App.tsx: unlisted). Kept out of search, the sitemap and llms.txt.
  thailand: {
    title: "Thailand 11-Day Backpacker Trip: Bangkok, Chiang Mai, Pai | Mad Monkey",
    description: `11 days from Bangkok to Chiang Mai and Pai. ${sorted}, from $${priceOf("thailand")}. ${deposit}`,
    noindex: true,
  },
};
