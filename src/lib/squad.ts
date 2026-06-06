import { supabase } from "@/integrations/supabase/client";

export interface SquadRegisterInput {
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  preferred_trip_slug?: string;
  preferred_month?: string;
  reason?: string;
}
export interface SquadRegisterResult {
  code: string;
  accessToken: string;
  returning?: boolean;
}

export async function registerSquadLeader(input: SquadRegisterInput): Promise<SquadRegisterResult> {
  const { data, error } = await supabase.functions.invoke("squad-register", { body: input });
  if (error) throw new Error(error.message);
  if (!data?.code) throw new Error(data?.error || "Could not register");
  return data as SquadRegisterResult;
}

export interface SquadBooking {
  id: string;
  booker_name: string | null;
  booker_email: string | null;
  trip_slug: string | null;
  departure_date: string | null;
  created_at: string;
}
export interface SquadDashboardData {
  leader: {
    name: string;
    email: string;
    code: string;
    preferredTripSlug: string | null;
    preferredMonth: string | null;
  };
  bookings: SquadBooking[];
  count: number;
  tier: { discountPct: number; nextLine: string; progress: number };
}

export async function getSquadDashboard(accessToken: string): Promise<SquadDashboardData> {
  const { data, error } = await supabase.functions.invoke("squad-dashboard", { body: { accessToken } });
  if (error) throw new Error(error.message);
  if (!data?.leader) throw new Error(data?.error || "Could not load dashboard");
  return data as SquadDashboardData;
}
