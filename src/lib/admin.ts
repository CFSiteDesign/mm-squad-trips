// Thin client for the admin-api edge function. Token-gated.
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "mm_admin_token";

export function getAdminToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function adminLogin(password: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("admin-verify", {
    body: { password },
  });
  if (error) throw new Error(error.message);
  if (!data?.token) throw new Error(data?.error ?? "Login failed");
  setAdminToken(data.token);
  return data.token as string;
}

async function call<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export type AdminTable = "trips" | "departures" | "pricing_calendar" | "discount_codes" | "bookings";

export const adminApi = {
  list: <T = Record<string, unknown>>(table: AdminTable, opts: { orderBy?: string; ascending?: boolean; limit?: number } = {}) =>
    call<{ rows: T[] }>({ table, op: "list", ...opts }).then((r) => r.rows),
  create: <T = Record<string, unknown>>(table: AdminTable, values: Record<string, unknown>) =>
    call<{ row: T }>({ table, op: "create", values }).then((r) => r.row),
  update: <T = Record<string, unknown>>(table: AdminTable, id: string, values: Record<string, unknown>) =>
    call<{ row: T }>({ table, op: "update", id, values }).then((r) => r.row),
  remove: (table: AdminTable, id: string) =>
    call<{ ok: true }>({ table, op: "delete", id }),
};

export async function importFromAirtable(): Promise<Record<string, number | string>> {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-import-airtable", {
    body: {},
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { report: Record<string, number | string> }).report;
}
