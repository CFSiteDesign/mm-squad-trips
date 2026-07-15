// utils/ecommerceDataLayer.ts
//
// GA4 `items[]` shape, ported from frontend/utils/ecommerceDataLayer.ts so this
// site's ecommerce events stay compatible with the same GTM container/GA4
// property, filed under their own "All In" item_category rather than blending
// into the existing "Accommodation"/"Tour" categories.

import { TRIPS } from "@/data/trips";
import type { Departure, Trip } from "@/types/trip";

export const MAD_MONKEY_AFFILIATION = "Mad Monkey Hostels";
export const MAD_MONKEY_BRAND = "Mad Monkey";

// This product is branded "ALL IN" (site title "Mad Monkey Group Trips —
// ALL IN.", production path /all-in-trips) — the taxonomy below uses that
// name explicitly rather than a generic "trip"/"Group Trip" label, so it's
// directly filterable in GA4/Google Ads reports without needing to know an
// internal naming convention.
export const ITEM_CATEGORY_ALL_IN = "All In";
export const LIST_ID_ALL_IN = "all-in-trips";
export const LIST_NAME_ALL_IN = "All In Trips";

/**
 * Top-level GA4 event parameter (sibling to `ecommerce`, not nested inside
 * it) already wired into the shared GTM-KC78NFHD container's ecommerce tag
 * (`{{dl - conversion_type}}`). The main site uses "room" | "tour"
 * (frontend/utils/bookingDataLayer.ts) to segment GA4/Google Ads reporting by
 * product line — "all_in" extends that same convention (lowercase, matching
 * "room"/"tour") for this product so its conversions aren't left blank on
 * that dimension.
 */
export const CONVERSION_TYPE_ALL_IN = "all_in";

/** A fully-formed GA4 ecommerce item. `item_category2` is optional/omitted when absent. */
export interface Ga4Item {
  item_id: string;
  item_name: string;
  affiliation: string;
  coupon: string;
  discount: number;
  index: number;
  item_brand: string;
  item_category: string;
  item_category2?: string;
  item_variant: string;
  item_list_id: string;
  item_list_name: string;
  location_id: string;
  price: number;
  quantity: number;
}

export interface Ga4ItemInput {
  item_id?: string | number | null;
  item_name?: string | null;
  price?: number | null;
  quantity?: number | null;
  index?: number;
  coupon?: string | null;
  discount?: number | null;
  item_category: string;
  item_category2?: string | null;
  item_variant?: string | null;
  item_list_id: string;
  item_list_name: string;
  location_id?: string | number | null;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toTrimmed = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const buildGa4Item = (input: Ga4ItemInput): Ga4Item => {
  const item: Ga4Item = {
    item_id: toTrimmed(input.item_id) || "unknown",
    item_name: toTrimmed(input.item_name),
    affiliation: MAD_MONKEY_AFFILIATION,
    coupon: toTrimmed(input.coupon),
    discount: toNumber(input.discount, 0),
    index: input.index ?? 0,
    item_brand: MAD_MONKEY_BRAND,
    item_category: input.item_category,
    item_variant: toTrimmed(input.item_variant),
    item_list_id: input.item_list_id,
    item_list_name: input.item_list_name,
    location_id: toTrimmed(input.location_id),
    price: toNumber(input.price, 0),
    quantity: toNumber(input.quantity, 1) || 1,
  };
  const category2 = toTrimmed(input.item_category2);
  if (category2) item.item_category2 = category2;
  return item;
};

/** Looks up the trip's country (item_category2) from the static TRIPS catalog. */
const countryForSlug = (slug: string): string | undefined =>
  TRIPS.find((t) => t.slug === slug)?.country;

export interface BuildTripItemOptions {
  quantity?: number;
  coupon?: string;
  discount?: number;
  index?: number;
}

/**
 * Maps this app's Trip + selected Departure into a GA4 item. Used for
 * view_item, begin_checkout, and (coarsely) purchase.
 */
export const buildTripEcommerceItem = (
  trip: Pick<Trip, "slug" | "name">,
  departure: Pick<Departure, "price"> | { price: number },
  options: BuildTripItemOptions = {},
): Ga4Item =>
  buildGa4Item({
    item_id: trip.slug,
    item_name: trip.name,
    price: departure.price,
    quantity: options.quantity ?? 1,
    index: options.index ?? 0,
    coupon: options.coupon,
    discount: options.discount,
    item_category: ITEM_CATEGORY_ALL_IN,
    item_category2: countryForSlug(trip.slug),
    item_variant: "",
    item_list_id: LIST_ID_ALL_IN,
    item_list_name: LIST_NAME_ALL_IN,
    location_id: "",
  });

/* ------------------------------------------------------------------ */
/* Once-per-checkout dedupe guard                                      */
/* ------------------------------------------------------------------ */

const memoryFlags = new Set<string>();

const readFlag = (key: string): boolean => {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(key) !== null;
    }
  } catch {
    /* sessionStorage may throw in private mode */
  }
  return memoryFlags.has(key);
};

const writeFlag = (key: string): void => {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(key, "1");
      return;
    }
  } catch {
    /* fall through to in-memory */
  }
  memoryFlags.add(key);
};

/**
 * Returns `true` the first time it is called for a given (event, key) pair and
 * `false` thereafter — so an event fires once per session even across
 * re-renders/retries. Backed by sessionStorage with an in-memory fallback.
 */
export const markCheckoutEventOnce = (eventName: string, dedupeKey: string | null | undefined): boolean => {
  if (!dedupeKey) return true;
  const key = `dl_once:${eventName}:${dedupeKey}`;
  if (readFlag(key)) return false;
  writeFlag(key);
  return true;
};
