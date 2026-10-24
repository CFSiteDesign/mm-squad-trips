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
} from "@/data/trip-content-indonesia";
import { DEFAULT_FAQS } from "@/components/trip/FAQ";
import indoHero from "@/assets/preview-indo-hero.jpg";
import vnPreviewHero from "@/assets/preview-vn-hero.jpg";
import {
  VN_SNAPSHOT, VN_IS_THIS_FOR_ME, VN_HIGHLIGHTS, VN_INCLUDED, VN_ITINERARY, VN_FAQ_OVERRIDES,
} from "@/data/trip-content-vietnam";
import {
  VN7_SNAPSHOT, VN7_IS_THIS_FOR_ME, VN7_HIGHLIGHTS, VN7_INCLUDED, VN7_ITINERARY, VN7_FAQ_OVERRIDES,
} from "@/data/trip-content-vietnam7";
import {
  I7_SNAPSHOT, I7_IS_THIS_FOR_ME, I7_HIGHLIGHTS, I7_INCLUDED, I7_ITINERARY, I7_FAQ_OVERRIDES,
} from "@/data/trip-content-indonesia7";
import indo7Hero from "@/assets/preview-indo7-hero.jpg";
import khPreviewHero from "@/assets/preview-kh-hero.jpg";
import {
  KH_SNAPSHOT, KH_IS_THIS_FOR_ME, KH_HIGHLIGHTS, KH_INCLUDED, KH_ITINERARY, KH_FAQ_OVERRIDES,
} from "@/data/trip-content-cambodia";
import vnHero from "@/assets/vn-hero.jpg";
import thHero from "@/assets/preview-th-hero.jpg";
import laHero from "@/assets/preview-la-hero.jpg";
import {
  TH_SNAPSHOT, TH_IS_THIS_FOR_ME, TH_HIGHLIGHTS, TH_INCLUDED, TH_NOT_INCLUDED, TH_ITINERARY,
} from "@/data/trip-content-thailand";
import {
  LA_SNAPSHOT, LA_IS_THIS_FOR_ME, LA_HIGHLIGHTS, LA_INCLUDED, LA_NOT_INCLUDED, LA_ITINERARY,
  LA_ADD_ONS, LA_ADD_ONS_NOTE, LA_GOOD_TO_KNOW,
} from "@/data/trip-content-laos";
import khHero from "@/assets/kh-hero.png";

export const TRIP_CONTENT_SLUGS = ["indonesia", "indonesia-7", "vietnam", "vietnam-7", "cambodia", "thailand", "laos"] as const;
export type TripSlug = (typeof TRIP_CONTENT_SLUGS)[number];

/** The small print under the free pre-night in "What's included" (Charlie, 24 Oct 2026). */
export const PRE_NIGHT_EMAIL = "cs@madmonkeyhostels.com";
export const PRE_NIGHT_NOTE = `Subject to availability. Claim via ${PRE_NIGHT_EMAIL}`;
export const isPreNight = (item: string) => /^free pre-(trip )?night/i.test(item);

export type Review = { property: string; author: string | null; rating: number; when: string | null; body: string };
export type Highlight = { title: string; image: string | null; /** Tailwind object-position, e.g. "object-right". */ position?: string };
/** A paid extra on top of the trip ("Want to go bigger?"). Not part of the from price. */
export type AddOn = { name: string; price: string; body: string };

export type TripContent = {
  hero: string;
  snapshot: { tripCode: string; days: number; from: string; to: string; countries: string; blurb: string };
  isThisForMe: { k: string; v: string }[];
  highlights: Highlight[];
  included: string[];
  notIncluded: string[];
  itinerary: Day[];
  reviews: Review[];
  faqs: { q: string; a: string }[];
  /** "Want to go bigger?": paid add-ons, shown under the inclusions. */
  addOns?: AddOn[];
  /** The line under the add-ons (how to book them). */
  addOnsNote?: string;
  /** "Good to know", shown under the day by day. */
  goodToKnow?: string;
  /** Sections with no real content yet, surfaced to the client rather than hidden. */
  pending: string[];
};

const HEROES: Partial<Record<TripSlug, string>> = {
  indonesia: indoHero,
  vietnam: vnHero,
  "vietnam-7": vnHero,
  cambodia: khHero,
  // indonesia-7 has no dedicated shot yet, so it renders a pending tile.
};

const GENERIC_NOT_INCLUDED = ["Flights", "Travel insurance", "Personal expenses", "Upgrades + add-ons"];

/** Builds a credible page from database content when no brief copy exists. */
function fromTrip(trip: Trip, slug: TripSlug): TripContent {
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
    hero: HEROES[slug] ?? indoHero,
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

export function getTripContent(trip: Trip, slug: TripSlug): TripContent {
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
      pending: ["Property reviews", "Route map (Dhany's animated version)"],
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
  if (slug === "thailand") {
    return {
      hero: thHero, // Wat Arun, Bangkok (from the Mad Monkey site)
      snapshot: TH_SNAPSHOT,
      isThisForMe: TH_IS_THIS_FOR_ME,
      highlights: TH_HIGHLIGHTS,
      included: TH_INCLUDED,
      notIncluded: TH_NOT_INCLUDED,
      itinerary: TH_ITINERARY,
      reviews: [],
      // The spec's FAQ is the shared ALL IN set, published as written.
      faqs: DEFAULT_FAQS,
      pending: ["Lod Cave photo", "Property reviews"],
    };
  }
  if (slug === "laos") {
    return {
      hero: laHero, // pool volleyball at Mad Monkey Vang Vieng (Mad Monkey site)
      snapshot: LA_SNAPSHOT,
      isThisForMe: LA_IS_THIS_FOR_ME,
      highlights: LA_HIGHLIGHTS,
      included: LA_INCLUDED,
      notIncluded: LA_NOT_INCLUDED,
      itinerary: LA_ITINERARY,
      reviews: [],
      faqs: DEFAULT_FAQS,
      addOns: LA_ADD_ONS,
      addOnsNote: LA_ADD_ONS_NOTE,
      goodToKnow: LA_GOOD_TO_KNOW,
      pending: ["Paramotor photo", "Property reviews"],
    };
  }
  if (slug === "vietnam-7") {
    return {
      hero: vnHero, // no dedicated 7-day shot yet; the stock Vietnam hero stands in
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
