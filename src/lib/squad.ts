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
  code?: string;
  accessToken?: string;
  returning?: boolean;
}

export async function registerSquadLeader(input: SquadRegisterInput): Promise<SquadRegisterResult> {
  const { data, error } = await supabase.functions.invoke("squad-register", { body: input });
  if (error) throw new Error(error.message);
  if (!data || (data.error && !data.returning)) throw new Error(data?.error || "Could not register");
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

export interface SquadAdminLeader {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string | null;
  code: string;
  preferredTripSlug: string | null;
  preferredMonth: string | null;
  reason: string | null;
  createdAt: string;
  accessToken: string;
  count: number;
  tier: string;
  bookings: (SquadBooking & { squad_leader_id: string })[];
}
export interface SquadAdminData {
  leaders: SquadAdminLeader[];
  stats: { totalLeaders: number; totalBookings: number; unlockedHalf: number; unlockedFree: number };
}
export async function getSquadAdmin(passwordOrToken: { password?: string; token?: string }): Promise<SquadAdminData> {
  const { password, token } = passwordOrToken;
  const { data, error } = await supabase.functions.invoke("squad-admin", {
    body: token ? {} : { password: password ?? "" },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw new Error(error.message);
  if (!data?.leaders) throw new Error(data?.error || "Could not load admin");
  return data as SquadAdminData;
}

export async function setSquadPassword(accessToken: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("squad-set-password", {
    body: { accessToken, password },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error || "Could not set password");
}

export async function loginSquadLeader(code: string, password: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("squad-login", {
    body: { code, password },
  });
  if (error) throw new Error(error.message);
  if (!data?.accessToken) throw new Error(data?.error || "Invalid squad code or password");
  return data.accessToken as string;
}

export async function requestSquadPasswordReset(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("squad-password-reset", {
    body: { email },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error || "Could not send reset email");
}

export async function confirmSquadPasswordReset(token: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("squad-password-reset-confirm", {
    body: { token, password },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error || "Could not reset password");
}
