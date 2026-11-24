// Thin client for the admin-api edge function. Token-gated.
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "mm_admin_token";

// Preview mode (/adminpreview): serve fake rows so the layout can be reviewed
// without a login. Never writes to the real database.
export function setAdminPreview(_on: boolean) {
  // no-op: preview mode is derived from the URL so it survives module reloads
}
export function isAdminPreview() {
  try {
    return typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "").endsWith("/adminpreview");
  } catch {
    return false;
  }
}


export function getAdminToken(): string | null {
  if (isAdminPreview()) return "preview";
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function adminLogin(password: string, variant?: "student"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("admin-verify", {
    body: { password, variant },
  });
  if (error) throw new Error(error.message);
  if (!data?.token) throw new Error(data?.error ?? "Login failed");
  setAdminToken(data.token);
  return data.token as string;
}

async function call<T = unknown>(body: Record<string, unknown>): Promise<T> {
  if (isAdminPreview()) {
    const { previewTables } = await import("@/lib/adminPreviewData");
    const table = body.table as AdminTable;
    if (body.op === "list") return { rows: previewTables[table] ?? [] } as T;
    throw new Error("Preview mode is read-only — log in at /admin to make changes.");
  }
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("admin-api", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctx = (error as Error & { context?: Response | string }).context;
    let detail: string | undefined;
    if (ctx && typeof (ctx as Response).text === "function") {
      try {
        const text = await (ctx as Response).text();
        try { detail = (JSON.parse(text) as { error?: string }).error; }
        catch { detail = text; }
      } catch { /* ignore */ }
    } else if (typeof ctx === "string") {
      try { detail = (JSON.parse(ctx) as { error?: string }).error ?? ctx; }
      catch { detail = ctx; }
    }
    throw new Error(detail || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export type AdminTable = "trips" | "departures" | "pricing_calendar" | "discount_codes" | "bookings" | "email_send_log";

export const adminApi = {
  list: <T = Record<string, unknown>>(table: AdminTable, opts: { orderBy?: string; ascending?: boolean; limit?: number } = {}) =>
    call<{ rows: T[] }>({ table, op: "list", ...opts }).then((r) => r.rows),
  create: <T = Record<string, unknown>>(table: AdminTable, values: Record<string, unknown>) =>
    call<{ row: T }>({ table, op: "create", values }).then((r) => r.row),
  update: <T = Record<string, unknown>>(table: AdminTable, id: string, values: Record<string, unknown>) =>
    call<{ row: T }>({ table, op: "update", id, values }).then((r) => r.row),
  remove: (table: AdminTable, id: string) =>
    call<{ ok: true }>({ table, op: "delete", id }),
  /** Cancels every row of the booking: stops any remaining charge and frees the spots. No refund, no email. */
  cancelBooking: (id: string) =>
    call<{ ok: true; spots?: number; trip?: string }>({ table: "bookings", op: "cancel-booking", id }),
};

// Booking sheets (Charlie, 24 Nov 2026): revenue attach the Excel booking endorsement
// to each booking. Stored in a private bucket; only admin-api can hand out a link.
export type BookingSheet = {
  id: string;
  booking_ref: string;
  file_name: string;
  size_bytes: number | null;
  uploaded_at: string;
};
export const SHEET_ACCEPT = ".xlsx,.xls,.xlsm,.csv,.pdf";
const SHEET_MAX_BYTES = 10 * 1024 * 1024;

/** Same rules as the server (supabase/functions/_shared/booking-sheets.ts), checked first so a wrong file fails fast. */
export function sheetProblem(file: { name: string; size: number }): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(file.name.trim())?.[1]?.toLowerCase() ?? "";
  if (!["xlsx", "xls", "xlsm", "csv", "pdf"].includes(ext)) return "Attach an Excel file (.xlsx, .xls, .xlsm), a .csv or a .pdf";
  if (file.size <= 0) return "That file is empty";
  if (file.size > SHEET_MAX_BYTES) return "That file is over 10 MB";
  return null;
}

export const bookingSheets = {
  list: async (): Promise<BookingSheet[]> => {
    if (isAdminPreview()) {
      const { previewBookingSheets } = await import("@/lib/adminPreviewData");
      return previewBookingSheets;
    }
    return call<{ sheets: BookingSheet[] }>({ table: "bookings", op: "sheets-list" }).then((r) => r.sheets ?? []);
  },
  upload: async (bookingRef: string, file: File): Promise<BookingSheet> => {
    const problem = sheetProblem(file);
    if (problem) throw new Error(problem);
    const { path, token } = await call<{ path: string; token: string }>({
      table: "bookings", op: "sheet-upload-url", booking_ref: bookingRef, file_name: file.name, size: file.size,
    });
    const { error } = await supabase.storage.from("booking-sheets").uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw new Error(error.message);
    return call<{ sheet: BookingSheet }>({
      table: "bookings", op: "sheet-save", booking_ref: bookingRef, path, file_name: file.name, content_type: file.type || null, size: file.size,
    }).then((r) => r.sheet);
  },
  /** A five-minute download link. */
  downloadUrl: (id: string) =>
    call<{ url: string }>({ table: "bookings", op: "sheet-download-url", id }).then((r) => r.url),
  remove: (id: string) =>
    call<{ ok: true }>({ table: "bookings", op: "sheet-delete", id }),
};

export async function addCompBooking(values: {
  trip_id: string;
  departure_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone?: string;
  lead_country?: string;
  lead_age?: string | number | null;
  notes?: string;
}) {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-add-comp-booking", {
    body: values,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctx = (error as Error & { context?: Response | string }).context;
    let detail: string | undefined;
    if (ctx && typeof (ctx as Response).text === "function") {
      try {
        const text = await (ctx as Response).text();
        try { detail = (JSON.parse(text) as { error?: string }).error; }
        catch { detail = text; }
      } catch { /* ignore */ }
    }
    throw new Error(detail || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { row: Record<string, unknown> }).row;
}

export type MmkQueueJob = {
  id?: number;
  bookingRef?: string;
  email?: string;
  eventName?: string;
  sendAt?: string;
  status?: string;
  ruleId?: number;
  error?: string | null;
};

export async function queueMmkReminder(values: {
  email: string;
  name?: string;
  tripSlug?: string;
  tripName?: string;
  departureDate?: string;
}) {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("send-test-klaviyo", {
    body: values,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctx = (error as Error & { context?: Response | string }).context;
    let detail: string | undefined;
    if (ctx && typeof (ctx as Response).text === "function") {
      try {
        const text = await (ctx as Response).text();
        try { detail = (JSON.parse(text) as { error?: string }).error; }
        catch { detail = text; }
      } catch { /* ignore */ }
    }
    throw new Error(detail || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as {
    ok: true;
    email: string;
    bookingRef: string;
    departureDate: string;
    queued: MmkQueueJob[];
    rules: Array<{ id: number; name: string; eventName: string; offsetMinutes: number }>;
    jobs: MmkQueueJob[];
  };
}

export async function backfillMmkReminders(scopes: Array<"previous" | "ongoing" | "upcoming"> = ["upcoming"]) {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("send-test-klaviyo", {
    body: { op: "backfill", scopes },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctx = (error as Error & { context?: Response | string }).context;
    let detail: string | undefined;
    if (ctx && typeof (ctx as Response).text === "function") {
      try {
        const text = await (ctx as Response).text();
        try { detail = (JSON.parse(text) as { error?: string }).error; }
        catch { detail = text; }
      } catch { /* ignore */ }
    }
    throw new Error(detail || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as {
    ok: true;
    scanned: number;
    queued: number;
    skipped: number;
    skippedPastSendAt: number;
    skippedNoEmail: number;
    skippedAllowlist: number;
    errors: number;
  };
}

export async function listMmkReminderJobs() {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("send-test-klaviyo", {
    body: { op: "jobs" },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctx = (error as Error & { context?: Response | string }).context;
    let detail: string | undefined;
    if (ctx && typeof (ctx as Response).text === "function") {
      try {
        const text = await (ctx as Response).text();
        try { detail = (JSON.parse(text) as { error?: string }).error; }
        catch { detail = text; }
      } catch { /* ignore */ }
    }
    throw new Error(detail || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { jobs: MmkQueueJob[] }).jobs ?? [];
}


