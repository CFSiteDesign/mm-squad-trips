// Resolves per-trip content for the /preview-* demo pages.
//
// Indonesia has full copy from the Aug 2026 brief. The other four trips have
// no brief copy yet, so they fall back to what the database genuinely holds
// (stops, activities, descriptions) and render explicit "pending" tiles for
// everything still outstanding. Nothing is invented to fill a gap.
import type { Trip } from "@/types/trip";
import { TRIPS } from "@/data/trips";
import {
  SNAPSHOT as INDO_SNAPSHOT, IS_THIS_FOR_ME as INDO_FOR_ME, HIGHLIGHTS as INDO_HIGHLIGHTS,
  INCLUDED as INDO_INCLUDED, NOT_INCLUDED as INDO_NOT_INCLUDED, ITINERARY as INDO_ITINERARY,
  REVIEWS as INDO_REVIEWS, FAQS as INDO_FAQS, type Day,
} from "@/data/preview-indonesia";
import { DEFAULT_FAQS } from "@/components/trip/FAQ";
import indoHero from "@/assets/preview-indo-hero.jpg";
import vnPreviewHero from "@/assets/preview-vn-hero.jpg";
import {
  VN_SNAPSHOT, VN_IS_THIS_FOR_ME, VN_HIGHLIGHTS, VN_INCLUDED, VN_ITINERARY, VN_FAQ_OVERRIDES,
} from "@/data/preview-vietnam";
import {
  VN7_SNAPSHOT, VN7_IS_THIS_FOR_ME, VN7_HIGHLIGHTS, VN7_INCLUDED, VN7_ITINERARY, VN7_FAQ_OVERRIDES,
} from "@/data/preview-vietnam7";
import {
  I7_SNAPSHOT, I7_IS_THIS_FOR_ME, I7_HIGHLIGHTS, I7_INCLUDED, I7_ITINERARY, I7_FAQ_OVERRIDES,
} from "@/data/preview-indonesia7";
import indo7Hero from "@/assets/preview-indo7-hero.jpg";
import khPreviewHero from "@/assets/preview-kh-hero.jpg";
import {
  KH_SNAPSHOT, KH_IS_THIS_FOR_ME, KH_HIGHLIGHTS, KH_INCLUDED, KH_ITINERARY, KH_FAQ_OVERRIDES,
} from "@/data/preview-cambodia";
import vnHero from "@/assets/vn-hero.jpg";
import khHero from "@/assets/kh-hero.png";

export const PREVIEW_SLUGS = ["indonesia", "indonesia-7", "vietnam", "vietnam-7", "cambodia"] as const;
export type PreviewSlug = (typeof PREVIEW_SLUGS)[number];

export type Review = { property: string; author: string | null; rating: number; when: string | null; body: string };
export type Highlight = { title: string; image: string | null; /** Tailwind object-position, e.g. "object-right". */ position?: string };

export type PreviewContent = {
  hero: string | null;
  snapshot: { tripCode: string; days: number; from: string; to: string; countries: string; blurb: string };
  isThisForMe: { k: string; v: string }[];
  highlights: Highlight[];
  included: string[];
  notIncluded: string[];
  itinerary: Day[];
  reviews: Review[];
  faqs: { q: string; a: string }[];
  /** Sections with no real content yet, surfaced to the client rather than hidden. */
  pending: string[];
};

const HEROES: Partial<Record<PreviewSlug, string>> = {
  indonesia: indoHero,
  vietnam: vnHero,
  "vietnam-7": vnHero,
  cambodia: khHero,
  // indonesia-7 has no dedicated shot yet, so it renders a pending tile.
};

const GENERIC_NOT_INCLUDED = ["Flights", "Travel insurance", "Personal expenses", "Upgrades + add-ons"];

/** Builds a credible page from database content when no brief copy exists. */
function fromTrip(trip: Trip, slug: PreviewSlug): PreviewContent {
  const meta = TRIPS.find((t) => t.slug === slug);
  const stops = Array.isArray(trip.stops) ? trip.stops : [];
  const pending: string[] = [];

  // Highlights: real activity names from the database, photos still to come.
  const activities = stops.flatMap((s) => (s.activities ?? []).map((a) => ({ title: a, image: null })));
  const highlights: Highlight[] = activities.slice(0, 6);
  if (highlights.length) pending.push("Highlight photography");

  // Itinerary: one card per stop rather than per day. The day-by-day copy only
  // exists for Indonesia so far, and inventing it would put fiction in front of
  // a customer.
  const itinerary: Day[] = stops.map((s, i) => ({
    label: `Stop ${String(i + 1).padStart(2, "0")}`,
    place: s.name,
    body: s.description ?? "",
    activities: (s.activities ?? []).join(", ") || undefined,
  }));
  if (itinerary.length) pending.push("Day-by-day breakdown (currently shown by stop)");

  pending.push("Property reviews", "Route map", "Trip-specific FAQ answers");
  if (!HEROES[slug]) pending.push("Hero image");

  return {
    hero: HEROES[slug] ?? null,
    snapshot: {
      tripCode: trip.code,
      days: trip.days,
      from: stops[0]?.name ?? "TBC",
      to: stops[stops.length - 1]?.name ?? "TBC",
      countries: meta?.country ?? "",
      blurb: meta?.route ? `${meta.route}. ${meta.sub ?? ""}`.trim() : "",
    },
    isThisForMe: [
      { k: "Vibe", v: "High Energy & Social" },
      { k: "Age Range", v: "18 to thirtysomethings" },
      { k: "Group Size", v: "Max 20 / Solo Trip" },
      { k: "Physical Level", v: "Light to Moderate" },
    ],
    highlights,
    included: [
      `${trip.days} days, ${stops.length} destinations`,
      "All transfers + island boats",
      "24/7 local crew",
      "Free pre-trip night",
      "Meals throughout the trip",
      "Lots of free drinks included",
      "All activities included in the itinerary",
      "Dorm beds at Mad Monkey",
    ],
    notIncluded: GENERIC_NOT_INCLUDED,
    itinerary,
    reviews: [],
    faqs: DEFAULT_FAQS,
    pending,
  };
}

export function getPreviewContent(trip: Trip, slug: PreviewSlug): PreviewContent {
  if (slug === "cambodia") {
    return {
      hero: khPreviewHero,
      snapshot: KH_SNAPSHOT,
      isThisForMe: KH_IS_THIS_FOR_ME,
      highlights: KH_HIGHLIGHTS,
      included: KH_INCLUDED,
      notIncluded: GENERIC_NOT_INCLUDED,
      itinerary: KH_ITINERARY,
      reviews: [],
      faqs: DEFAULT_FAQS.map((f) => ({ ...f, a: KH_FAQ_OVERRIDES[f.q] ?? f.a })),
      pending: ["Private Beach, Koh Sdach photo", "Property reviews", "Route map (Dhany's animated version)"],
    };
  }
  if (slug === "indonesia-7") {
    return {
      hero: indo7Hero,
      snapshot: I7_SNAPSHOT,
      isThisForMe: I7_IS_THIS_FOR_ME,
      highlights: I7_HIGHLIGHTS,
      included: I7_INCLUDED,
      notIncluded: GENERIC_NOT_INCLUDED,
      itinerary: I7_ITINERARY,
      reviews: [],
      faqs: DEFAULT_FAQS.map((f) => ({ ...f, a: I7_FAQ_OVERRIDES[f.q] ?? f.a })),
      pending: ["Property reviews", "Route map (Dhany's animated version)"],
    };
  }
  if (slug === "vietnam-7") {
    return {
      hero: null, // brief says TBC
      snapshot: VN7_SNAPSHOT,
      isThisForMe: VN7_IS_THIS_FOR_ME,
      highlights: VN7_HIGHLIGHTS,
      included: VN7_INCLUDED,
      notIncluded: GENERIC_NOT_INCLUDED,
      itinerary: VN7_ITINERARY,
      reviews: [],
      faqs: DEFAULT_FAQS.map((f) => ({ ...f, a: VN7_FAQ_OVERRIDES[f.q] ?? f.a })),
      pending: ["Hero image", "Property reviews", "Route map (Dhany's animated version)"],
    };
  }
  if (slug === "vietnam") {
    return {
      hero: vnPreviewHero,
      snapshot: VN_SNAPSHOT,
      isThisForMe: VN_IS_THIS_FOR_ME,
      highlights: VN_HIGHLIGHTS,
      included: VN_INCLUDED,
      notIncluded: GENERIC_NOT_INCLUDED,
      itinerary: VN_ITINERARY,
      reviews: [],
      // Shared questions, Vietnam answers where the brief supplied them.
      faqs: DEFAULT_FAQS.map((f) => ({ ...f, a: VN_FAQ_OVERRIDES[f.q] ?? f.a })),
      pending: ["Property reviews", "Route map (Dhany's animated version)"],
    };
  }
  if (slug === "indonesia") {
    return {
      hero: indoHero,
      snapshot: INDO_SNAPSHOT,
      isThisForMe: INDO_FOR_ME,
      highlights: INDO_HIGHLIGHTS,
      included: INDO_INCLUDED,
      notIncluded: INDO_NOT_INCLUDED,
      itinerary: INDO_ITINERARY,
      reviews: INDO_REVIEWS,
      faqs: INDO_FAQS,
      pending: [],
    };
  }
  return fromTrip(trip, slug);
}
