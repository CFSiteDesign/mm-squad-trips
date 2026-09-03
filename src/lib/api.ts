import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "@/types/trip";
import { getLocalPrice } from "@/data/pricingCalendar";

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return "Request failed";

  const context = (error as Error & { context?: unknown }).context;
  if (typeof context === "string") {
    try {
      const parsed = JSON.parse(context) as { error?: string; message?: string };
      if (parsed.error || parsed.message) return parsed.error || parsed.message || error.message;
    } catch {
      return context;
    }
  }

  return error.message;
}

export async function fetchTrip(slug: string, squadCode?: string): Promise<Trip> {
  const { data, error } = await supabase.functions.invoke("trips-get", {
    body: squadCode ? { slug, squadCode } : { slug },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (!data?.trip) throw new Error(data?.error || "Trip not found");
  const trip = data.trip as Trip;

  // Apply local pricing calendar so prices don't depend on Airtable's Pricing table.
  trip.departures = trip.departures.map((d) => {
    const local = getLocalPrice(slug, d.date);
    if (!local) return d;
    return { ...d, price: local.price, strikethrough: local.strikethrough ?? d.strikethrough };
  });

  return trip;
}

export interface DiscountResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  newTotal?: number;
  /** Stacked codes: fixed comes off first, then stackPercent of the remainder. */
  stackFixed?: number;
  stackPercent?: number;
  /** This code may be combined with one other stackable code. */
  stackable?: boolean;
  /** True when the discount hit the global max-discount cap. */
  capped?: boolean;
  /** Creator tracking code: $0 off, the booking enters the shared prize draw. */
  isCreator?: boolean;
  creatorName?: string;
  /** "squad" when the code belongs to a squad leader rather than a discount. */
  kind?: string;
}

export async function validateDiscount(input: {
  code: string;
  /** Optional second code — combines with the first when both are stackable. */
  secondCode?: string;
  tripSlug: string;
  amount: number;
  /** ISO date of the selected departure — used for month-restricted codes. */
  departureDate?: string;
}): Promise<DiscountResult> {
  const { data, error } = await supabase.functions.invoke("validate-discount", { body: input });
  if (error) return { valid: false, reason: error.message };
  return data as DiscountResult;
}

export interface CreateCheckoutInput {
  tripSlug: string;
  /** Existing departure row. Omit when supplying customDate instead. */
  departureId?: string;
  /** ISO date for a guest-created custom departure (squad leaders + solo). */
  customDate?: string;
  groupSize: number;
  leadBooker: unknown;
  travelers: unknown[];
  discountCode?: string;
  /** Second stackable code — combined server-side (fixed first, then %). */
  secondDiscountCode?: string;
  /** Squad leader code, sent separately so it can sit alongside a discount
   *  code: the discount changes the price, the squad code credits the leader. */
  squadCode?: string;
  friendsMentioned?: string;
  /** Optional "Mad Monkey staff recommendation" name from the booking form. */
  staffRecommendation?: string;
  utm?: Record<string, string>;
  /** GA4 client id (from the _ga cookie) so a later server-side balance charge
   *  can be attributed to the same session/campaign in GA4. Empty when the
   *  visitor declined analytics cookies (no _ga cookie exists). */
  gaClientId?: string;
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: input });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (!data?.url) throw new Error(data?.error || "Could not create checkout session");
  return data as { url: string };
}
