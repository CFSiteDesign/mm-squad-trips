// Crew heads-up 10 days before a departure that is still under 5 travellers.
//
// Charlie, 6 Oct 2026: crew trips run even if they don't fill. The 30-day
// auto-cancel in cancel-underfilled-departures no longer touches departures
// with bookings. Instead, 10 days out, every crew lead booker (lead_solo
// false) on a departure with fewer than min_bookings_to_confirm Confirmed spots
// gets a short heads-up: it's going ahead, you'll meet plenty of people, and
// cs@ will refund the deposit if you'd rather not go.
//
// The window is 10 to 8 days out so a missed run still sends before the
// balance is charged at 7 days. Each booking is told once
// (bookings.underfill_notice_sent_at). Any departure still 'pending' with
// bookings inside 10 days is flipped to 'confirmed' so the 7-day final details
// email (send-departure-reminders) goes out. The flip writes no
// departure_events row, so nobody gets the "you hit 5" email by mistake.
//
// Daily from pg_cron at 02:00 UTC. POST {"dry_run": true} lists what would
// happen without sending, stamping or flipping.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail, underfilledCrewNoticeEmail } from "../_shared/email.ts";

const NOTICE_MAX_DAYS = 10;
const NOTICE_MIN_DAYS = 8;
const LOCAL_UTC_OFFSET_HOURS = 7;
const CS_EMAIL = "cs@madmonkeyhostels.com";

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
const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

type Booking = {
  stripe_session_id: string | null;
  spot_number: number | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_solo: boolean | null;
  booking_ref: string | null;
  balance_status: string | null;
  balance_due_date: string | null;
  underfill_notice_sent_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return json({ error: "not configured" }, 503);
  const sb = createClient(sbUrl, sbKey);

  const { data: vaultSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) return json({ error: "cron secret unavailable" }, 503);
  const secret = normalizeCronSecret(typeof vaultSecret === "string" ? vaultSecret : null);
  if (!secret || normalizeCronSecret(req.headers.get("x-cron-secret")) !== secret) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cron sends {} */ }
  const dry = body.dry_run === true;

  const today = localToday();
  const { data: departures, error: depErr } = await sb
    .from("departures")
    .select("id,departure_date,status,min_bookings_to_confirm,trips(slug,days)")
    .in("status", ["pending", "confirmed"])
    .gte("departure_date", today)
    .lte("departure_date", plusDays(today, NOTICE_MAX_DAYS))
    .order("departure_date");
  if (depErr) return json({ error: depErr.message }, 500);

  const out: Record<string, unknown>[] = [];
  for (const dep of departures ?? []) {
    const date = String(dep.departure_date);
    const daysOut = daysBetween(today, date);
    const min = Number(dep.min_bookings_to_confirm ?? 5) || 5;
    const trip = (dep.trips as { slug?: string; days?: number } | null) ?? {};
    // DB trip names are inconsistent ("Vietnam", "7 Day Gili T + Lombok"), so
    // the guest-facing name is built from the trip: "14-day Vietnam".
    const country = (trip.slug ?? "").split("-")[0].replace(/^./, (c) => c.toUpperCase());
    const tripLabel = trip.days && country ? `${trip.days}-day ${country}` : country || "ALL IN";

    const { data: rows, error: bkErr } = await sb
      .from("bookings")
      .select("stripe_session_id,spot_number,lead_name,lead_email,lead_solo,booking_ref,balance_status,balance_due_date,underfill_notice_sent_at")
      .eq("departure_id", dep.id)
      .eq("status", "Confirmed");
    if (bkErr) { out.push({ departure: date, trip: trip.slug, error: bkErr.message }); continue; }
    const bookings = (rows ?? []) as Booking[];
    if (bookings.length === 0) continue;

    const entry: Record<string, unknown> = { departure: date, trip: trip.slug, daysOut, travellers: bookings.length, status: dep.status, notices: [] as unknown[] };

    if (bookings.length < min && daysOut >= NOTICE_MIN_DAYS && daysOut <= NOTICE_MAX_DAYS) {
      const leads = bookings.filter((b) => Number(b.spot_number ?? 1) === 1 && b.lead_solo !== true && !b.underfill_notice_sent_at && b.lead_email);
      for (const lead of leads) {
        const owesBalance = (lead.balance_status === "scheduled" || lead.balance_status === "failed") && lead.balance_due_date;
        const { subject, html } = underfilledCrewNoticeEmail({
          firstName: (lead.lead_name ?? "").trim().split(/\s+/)[0] || "there",
          tripName: tripLabel,
          departureDate: dateLabel(date),
          bookingRef: lead.booking_ref ?? "",
          balanceDate: owesBalance ? dateLabel(String(lead.balance_due_date)) : "",
        });
        const notice = { ref: lead.booking_ref, to: lead.lead_email, subject };
        if (dry) { (entry.notices as unknown[]).push({ ...notice, result: "would send" }); continue; }
        try {
          await sendEmail({ to: lead.lead_email as string, subject, html, replyTo: CS_EMAIL, templateName: "underfilled_crew_notice" });
          await sb.from("bookings").update({ underfill_notice_sent_at: new Date().toISOString() }).eq("stripe_session_id", lead.stripe_session_id);
          (entry.notices as unknown[]).push({ ...notice, result: "sent" });
        } catch (e) {
          (entry.notices as unknown[]).push({ ...notice, result: "failed", error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

    // Going ahead regardless, so make sure the 7-day final details email fires.
    if (dep.status === "pending") {
      if (dry) entry.flip = "would mark confirmed";
      else {
        const { error: flipErr } = await sb.from("departures").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", dep.id).eq("status", "pending");
        entry.flip = flipErr ? `failed: ${flipErr.message}` : "marked confirmed";
      }
    }
    out.push(entry);
  }

  return json({ ok: true, dry, today, departures: out });
});
