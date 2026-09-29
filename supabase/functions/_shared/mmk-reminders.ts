// Push an ALL IN lead onto the MMK Check-in reminder job queue.
// Never throws: a reminder outage must not become a booking problem.
//
// Secrets (Edge Function, not VITE_):
//   MMK_CHECKIN_REMINDER_URL   full POST url, …/internal/check-in-reminders/enqueue-allin
//   MMK_CHECKIN_REMINDER_TOKEN same value as MMK CHECK_IN_REMINDER_INTERNAL_TOKEN
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type MmkAllInGuest = {
  bookingRef: string;
  email: string;
  firstName?: string;
  lastName?: string;
  departureDate: string;
  checkoutDate?: string;
  timezone?: string;
  clock?: string;
  tripSlug?: string;
  properties?: Record<string, unknown>;
  ruleId?: number;
  skipPast?: boolean;
  onlyIfNew?: boolean;
};

export type MmkStayScope = "previous" | "ongoing" | "upcoming";

const NIGHTS: Record<string, number> = { vietnam: 13, thailand: 10 };

function plusDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function stayScope(departure: string, end: string, today: string): MmkStayScope {
  if (departure >= today) return "upcoming";
  if (end >= today) return "ongoing";
  return "previous";
}

function countryFromSlug(slug: string): string {
  const raw = slug.split("-")[0] ?? "";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
}

function money(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Properties stored on the MMK job and copied onto the Klaviyo event. */
export function allInReminderProperties(input: {
  bookingId?: string | null;
  bookingRef: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  tripSlug?: string | null;
  tripName?: string | null;
  tripDays?: number | null;
  departureDate: string;
  checkoutDate?: string | null;
  bookedAt?: string | null;
  amountPaid?: unknown;
  fullDue?: unknown;
  spots?: unknown;
  stripeSessionId?: string | null;
  test?: boolean;
  backfill?: boolean;
}): Record<string, unknown> {
  const slug = String(input.tripSlug ?? "").trim();
  const days = Number(input.tripDays ?? 0) || null;
  const country = countryFromSlug(slug);
  const tripName = country && days ? `${country} ${days} Days` : (input.tripName || null);
  const amountPaid = money(input.amountPaid);
  const fullDue = money(input.fullDue);
  const balanceDue =
    fullDue != null && amountPaid != null
      ? Math.max(0, Math.round((fullDue - amountPaid) * 100) / 100)
      : null;
  const bookedAt = input.bookedAt ? String(input.bookedAt) : null;
  return {
    booking_id: input.bookingId || null,
    booking_ref: input.bookingRef,
    email: input.email,
    guest_email: input.email,
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    destination: country || null,
    country: country || null,
    trip: slug || null,
    trip_name: tripName,
    departure_date: input.departureDate,
    check_in_date: input.departureDate,
    check_out_date: input.checkoutDate || null,
    booking_date: bookedAt ? bookedAt.slice(0, 10) : null,
    booked_at: bookedAt,
    amount_paid: amountPaid,
    full_due: fullDue,
    amount_due: balanceDue,
    balance_due: balanceDue,
    currency: "USD",
    spots: Number(input.spots ?? 1) || 1,
    stripe_session_id: input.stripeSessionId || null,
    allin_booking_ref: input.bookingRef,
    allin_trip: slug || null,
    allin_trip_name: tripName,
    allin_country: country || null,
    allin_departure_date: input.departureDate,
    allin_end_date: input.checkoutDate || null,
    allin_days: days,
    ...(input.test ? { test: true } : {}),
    ...(input.backfill ? { backfill: true } : {}),
  };
}

export type MmkEnqueueResult = {
  ok: boolean;
  skipped?: string;
  skippedPast?: number;
  skippedExisting?: number;
  queued?: Array<{ ruleId: number; eventName: string; sendAt: string }>;
  rules?: Array<{ id: number; name: string; eventName: string; offsetMinutes: number }>;
  jobs?: Array<{
    id: number;
    bookingRef: string;
    email: string;
    eventName: string;
    sendAt: string;
    status: string;
    error: string | null;
  }>;
  message?: string;
};

function reminderUrl(): string | null {
  const raw = Deno.env.get("MMK_CHECKIN_REMINDER_URL")?.trim();
  if (!raw) return null;
  if (raw.includes("/enqueue-allin")) return raw;
  return `${raw.replace(/\/$/, "")}/enqueue-allin`;
}

function reminderToken(): string | null {
  return Deno.env.get("MMK_CHECKIN_REMINDER_TOKEN")?.trim() || null;
}

export async function enqueueAllInToMmk(guest: MmkAllInGuest): Promise<MmkEnqueueResult> {
  const url = reminderUrl();
  const token = reminderToken();
  const email = guest.email.trim().toLowerCase();
  if (!url || !token) {
    console.warn("MMK check-in reminder not configured; skip queue");
    return { ok: false, skipped: "MMK_CHECKIN_REMINDER_URL / TOKEN not set" };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, skipped: "no lead email" };
  }
  if (!guest.departureDate) {
    return { ok: false, skipped: "no departure date" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": token,
      },
      body: JSON.stringify({
        bookingRef: guest.bookingRef,
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        departureDate: guest.departureDate,
        checkoutDate: guest.checkoutDate,
        timezone: guest.timezone,
        clock: guest.clock,
        tripSlug: guest.tripSlug ?? (guest.properties?.allin_trip as string | undefined) ?? (guest.properties?.trip as string | undefined),
        properties: guest.properties,
        ruleId: guest.ruleId,
        skipPast: guest.skipPast,
        onlyIfNew: guest.onlyIfNew,
      }),
    });
    const body = await res.json().catch(() => ({})) as MmkEnqueueResult & { message?: string };
    if (!res.ok) {
      const message = body.message || `MMK reminder ${res.status}`;
      console.warn("MMK check-in reminder enqueue failed:", message);
      return { ok: false, message };
    }
    return {
      ok: true,
      queued: body.queued,
      rules: body.rules,
      skippedPast: Number(body.skippedPast ?? 0),
      skippedExisting: Number(body.skippedExisting ?? 0),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("MMK check-in reminder enqueue threw:", message);
    return { ok: false, message };
  }
}

export async function listAllInMmkJobs(limit = 50): Promise<MmkEnqueueResult> {
  const token = reminderToken();
  const enqueue = reminderUrl();
  if (!enqueue || !token) {
    return { ok: false, skipped: "MMK_CHECKIN_REMINDER_URL / TOKEN not set" };
  }
  const url = enqueue.replace(/\/enqueue-allin\/?$/, "/jobs") + `?limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { "x-internal-token": token },
    });
    const body = await res.json().catch(() => ({})) as MmkEnqueueResult & { message?: string };
    if (!res.ok) {
      return { ok: false, message: body.message || `MMK jobs ${res.status}` };
    }
    return { ok: true, jobs: body.jobs };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function backfillAllInBookingsToMmk(
  sb: SupabaseClient,
  opts: {
    ruleId?: number;
    scopes: MmkStayScope[];
    previousDays?: number;
    testEmails?: Set<string>;
    dryRun?: boolean;
  },
): Promise<{
  ok: boolean;
  scanned: number;
  queued: number;
  skipped: number;
  skippedPastSendAt: number;
  skippedNoEmail: number;
  skippedAllowlist: number;
  skippedTerminal: number;
  errors: number;
  done: true;
}> {
  const scopes = new Set(opts.scopes);
  const today = new Date().toISOString().slice(0, 10);
  const previousDays = Math.min(Math.max(1, Math.floor(opts.previousDays ?? 90)), 365);
  const previousFrom = plusDays(today, -previousDays);
  const result = {
    ok: true,
    scanned: 0,
    queued: 0,
    skipped: 0,
    skippedPastSendAt: 0,
    skippedNoEmail: 0,
    skippedAllowlist: 0,
    skippedTerminal: 0,
    errors: 0,
    done: true as const,
  };

  const { data: leads, error } = await sb
    .from("bookings")
    .select("id,booking_ref,lead_email,lead_name,status,spot_number,group_size,amount_paid,final_price,created_at,stripe_session_id,trip_id,departure_id,trips(slug,name,days),departures(departure_date,status)")
    .eq("spot_number", 1)
    .eq("status", "Confirmed");
  if (error) throw new Error(error.message);

  for (const row of leads ?? []) {
    result.scanned += 1;
    const trip = one(row.trips as { slug?: string; name?: string; days?: number } | { slug?: string; name?: string; days?: number }[] | null);
    const dep = one(row.departures as { departure_date?: string; status?: string } | { departure_date?: string; status?: string }[] | null);
    const departure = String(dep?.departure_date ?? "").slice(0, 10);
    const email = String(row.lead_email ?? "").trim().toLowerCase();
    const bookingRef = String(row.booking_ref ?? "").trim();
    const depStatus = String(dep?.status ?? "").toLowerCase();

    if (!departure || !bookingRef) {
      result.skipped += 1;
      continue;
    }
    if (depStatus.includes("cancel")) {
      result.skipped += 1;
      result.skippedTerminal += 1;
      continue;
    }
    if (!email || !email.includes("@")) {
      result.skipped += 1;
      result.skippedNoEmail += 1;
      continue;
    }
    const baseEmail = email.replace(/\+[^@]+@/, "@");
    if (opts.testEmails && opts.testEmails.size > 0 && !opts.testEmails.has(email) && !opts.testEmails.has(baseEmail)) {
      result.skipped += 1;
      result.skippedAllowlist += 1;
      continue;
    }

    const slug = String(trip?.slug ?? "");
    const days = Number(trip?.days ?? 0) || 0;
    const nights = slug ? (NIGHTS[slug] ?? days) : days;
    const checkout = departure && nights ? plusDays(departure, nights) : departure;
    const scope = stayScope(departure, checkout, today);
    if (!scopes.has(scope)) {
      result.skipped += 1;
      continue;
    }
    if (scope === "previous" && checkout < previousFrom) {
      result.skipped += 1;
      continue;
    }

    const leadName = String(row.lead_name ?? "").trim();
    const [firstName, ...rest] = leadName.split(/\s+/);
    if (opts.dryRun) {
      result.queued += 1;
      continue;
    }
    const sent = await enqueueAllInToMmk({
      bookingRef,
      email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      departureDate: departure,
      checkoutDate: checkout,
      tripSlug: slug,
      ruleId: opts.ruleId,
      skipPast: true,
      onlyIfNew: true,
      properties: allInReminderProperties({
        bookingId: row.id != null ? String(row.id) : null,
        bookingRef,
        email,
        firstName,
        lastName: rest.join(" ") || null,
        tripSlug: slug,
        tripName: trip?.name,
        tripDays: days || null,
        departureDate: departure,
        checkoutDate: checkout,
        bookedAt: row.created_at != null ? String(row.created_at) : null,
        amountPaid: row.amount_paid,
        fullDue: row.final_price,
        spots: row.group_size,
        stripeSessionId: row.stripe_session_id != null ? String(row.stripe_session_id) : null,
        backfill: true,
      }),
    });
    if (sent.skipped === "no lead email") {
      result.skipped += 1;
      result.skippedNoEmail += 1;
      continue;
    }
    if (!sent.ok) {
      if ((sent.message || "").includes("ALLOWED_EMAILS")) {
        result.skipped += 1;
        result.skippedAllowlist += 1;
        continue;
      }
      result.errors += 1;
      continue;
    }
    const n = sent.queued?.length ?? 0;
    result.queued += n;
    result.skippedPastSendAt += sent.skippedPast ?? 0;
    if (n === 0 && (sent.skippedExisting ?? 0) > 0) result.skipped += 1;
    else if (n === 0) result.skipped += 1;
  }

  return result;
}
