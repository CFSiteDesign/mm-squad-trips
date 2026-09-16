// Property-team reminders, 7 days and 1 day before every ALL IN departure
// that has confirmed bookings. Charlie, 10 Sep 2026: to the GMs (the
// per-country list in TRIP_OPS_CC, his own definition from July), to
// reception@, and for Vietnam also the Hanoi and Hoi An travel desks.
//
// Runs daily from pg_cron at 01:00 UTC, which is 08:00 in Indochina and 09:00
// in Bali, so "today" is worked out at UTC+7. Each departure gets each
// reminder once (team_reminder_7d_sent_at / team_reminder_1d_sent_at). The
// windows are wider than one day (5-7 days out, 0-1 day out) so a missed run
// sends late rather than never; the email always says the real days-out.
//
// POST {"dry_run": true} lists what would go out without sending or stamping.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL, departureTeamReminderEmail, opsCcForTrip, sendEmail, type TeamReminderBooking } from "../_shared/email.ts";

const RECEPTION = "reception@madmonkeyhostels.com";
const VIETNAM_TRAVEL_DESKS = ["travel.hanoi@madmonkeyhostels.com", "travel.hoian@madmonkeyhostels.com"];
const LOCAL_UTC_OFFSET_HOURS = 7;

const WINDOWS = [
  { kind: "7d", column: "team_reminder_7d_sent_at", min: 5, max: 7 },
  { kind: "1d", column: "team_reminder_1d_sent_at", min: 0, max: 1 },
] as const;

function localToday(): string {
  return new Date(Date.now() + LOCAL_UTC_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}
function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(toYmd + "T00:00:00Z") - Date.parse(fromYmd + "T00:00:00Z")) / 86_400_000);
}
function plusDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dateLabel = (ymd: string) =>
  new Date(ymd + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

type BookingRow = {
  stripe_session_id: string;
  booking_ref: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  spot_number: number | null;
  group_size: number | null;
  group_members: string[] | null;
  balance_amount: number | null;
  balance_status: string | null;
  balance_due_date: string | null;
  traveller_mode: string | null;
  lead_solo: boolean | null;
};

function paymentLabel(lead: BookingRow, spots: number): string {
  const owed = Number(lead.balance_amount ?? 0) * spots;
  if (owed <= 0 || lead.balance_status === "charged") return "Paid in full";
  const due = lead.balance_due_date ? ` due ${dateLabel(lead.balance_due_date)}` : "";
  if (lead.balance_status === "failed") return `Balance ${money(owed)} FAILED, retrying`;
  if (lead.balance_status === "failed_final") return `Balance ${money(owed)} UNPAID`;
  return `Balance ${money(owed)}${due}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return json({ error: "not configured" }, 503);
  const sb = createClient(sbUrl, sbKey);

  // Fail-closed cron secret guard, same as the other cron-driven functions.
  const provided = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) return json({ error: "cron secret unavailable" }, 503);
  const secret = normalizeCronSecret(typeof vaultSecret === "string" ? vaultSecret : null);
  if (!secret || provided !== secret) return json({ error: "forbidden" }, 403);

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // no body from cron
  }

  const today = localToday();
  const { data: deps, error: depErr } = await sb
    .from("departures")
    .select("id,trip_id,departure_date,status,departure_code,visibility,team_reminder_7d_sent_at,team_reminder_1d_sent_at")
    .neq("status", "cancelled")
    .gte("departure_date", today)
    .lte("departure_date", plusDays(today, 7))
    .order("departure_date");
  if (depErr) return json({ error: depErr.message }, 500);

  const tripIds = [...new Set((deps ?? []).map((d) => d.trip_id as string))];
  const { data: trips } = tripIds.length
    ? await sb.from("trips").select("id,name,slug,days").in("id", tripIds)
    : { data: [] as { id: string; name: string; slug: string; days: number | null }[] };
  const tripById = new Map((trips ?? []).map((t) => [t.id, t]));

  const results: Array<Record<string, unknown>> = [];
  for (const dep of deps ?? []) {
    const daysOut = daysBetween(today, dep.departure_date as string);
    const window = WINDOWS.find((w) => daysOut >= w.min && daysOut <= w.max && !dep[w.column]);
    if (!window) continue;
    const trip = tripById.get(dep.trip_id as string);
    if (!trip) continue;

    const { data: rows, error: bErr } = await sb
      .from("bookings")
      .select("stripe_session_id,booking_ref,lead_name,lead_email,lead_phone,spot_number,group_size,group_members,balance_amount,balance_status,balance_due_date,traveller_mode,lead_solo")
      .eq("departure_id", dep.id)
      .eq("status", "Confirmed");
    if (bErr) {
      results.push({ departure: dep.id, error: bErr.message });
      continue;
    }
    const bySession = new Map<string, BookingRow[]>();
    for (const r of (rows ?? []) as BookingRow[]) {
      const g = bySession.get(r.stripe_session_id);
      if (g) g.push(r);
      else bySession.set(r.stripe_session_id, [r]);
    }
    if (bySession.size === 0) continue; // nobody on it, nothing to remind

    const bookings: TeamReminderBooking[] = [];
    for (const group of bySession.values()) {
      group.sort((a, b) => Number(a.spot_number ?? 0) - Number(b.spot_number ?? 0));
      const lead = group[0];
      const spots = group.length;
      bookings.push({
        ref: lead.booking_ref || lead.stripe_session_id.slice(-8),
        leadName: lead.lead_name || "Unknown",
        email: lead.lead_email || "",
        phone: lead.lead_phone || "",
        spots,
        type:
          lead.traveller_mode === "independent" ? "Independent (guaranteed)"
          : lead.traveller_mode === "crew" ? "With a crew"
          : lead.lead_solo ? "Solo (guaranteed)" : "Group",
        payment: paymentLabel(lead, spots),
        members: (lead.group_members ?? []).filter(Boolean).join(", "),
      });
    }
    bookings.sort((a, b) => a.ref.localeCompare(b.ref));
    const travellers = bookings.reduce((n, b) => n + b.spots, 0);

    const isVietnam = /vietnam/i.test(`${trip.name} ${trip.slug}`);
    const to = [...new Set([RECEPTION, ...opsCcForTrip(trip.name, trip.slug), ...(isVietnam ? VIETNAM_TRAVEL_DESKS : [])])];

    const { subject, html } = departureTeamReminderEmail({
      daysOut,
      // The 7-day trips are named "ALL IN · …" in the database; the email
      // already says ALL IN.
      tripName: trip.name.replace(/^ALL IN\s*[·\-–]\s*/i, ""),
      tripDays: trip.days,
      departureDate: dateLabel(dep.departure_date as string),
      departureStatus: String(dep.status),
      departureCode: dep.departure_code as string | null,
      travellers,
      bookings,
      adminUrl: `${APP_URL}/admin`,
    });

    const summary = { departure: dep.id, date: dep.departure_date, trip: trip.slug, kind: window.kind, daysOut, travellers, bookings: bookings.length, to, subject };
    if (dryRun) {
      results.push(summary);
      continue;
    }
    try {
      await sendEmail({ to, subject, html, templateName: `departure_team_reminder_${window.kind}` });
      await sb.from("departures").update({ [window.column]: new Date().toISOString() }).eq("id", dep.id);
      results.push({ ...summary, sent: true });
    } catch (e) {
      results.push({ ...summary, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({ ok: true, today, dryRun, processed: results.length, results });
});
