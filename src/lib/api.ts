import { supabase } from "@/integrations/supabase/client";
import type { Trip } from "@/types/trip";

export async function fetchTrip(slug: string): Promise<Trip> {
  const { data, error } = await supabase.functions.invoke("trips-get", {
    body: { slug },
  });
  if (error) throw error;
  if (!data?.trip) throw new Error(data?.error || "Trip not found");
  return data.trip as Trip;
}

export interface DiscountResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  newTotal?: number;
}

export async function validateDiscount(input: {
  code: string;
  tripSlug: string;
  amount: number;
}): Promise<DiscountResult> {
  const { data, error } = await supabase.functions.invoke("validate-discount", { body: input });
  if (error) return { valid: false, reason: error.message };
  return data as DiscountResult;
}

export interface CreateCheckoutInput {
  tripSlug: string;
  departureId: string;
  groupSize: number;
  leadBooker: Record<string, unknown>;
  travelers: Record<string, unknown>[];
  discountCode?: string;
  friendsMentioned?: string;
  utm?: Record<string, string>;
}

export async function createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: input });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "Could not create checkout session");
  return data as { url: string };
}
