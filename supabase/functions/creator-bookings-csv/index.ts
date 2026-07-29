// CSV feed of every booking made with a creator tracking code, for Dhany's
// team to action the 2 free Mad Monkey Loyalty nights.
//
// Google Sheets pulls this with IMPORTDATA():
//   =IMPORTDATA("https://<project>.functions.supabase.co/creator-bookings-csv?key=…")
//
// Sheets fetches anonymously, so this is a public GET guarded by a shared key
// (CREATOR_CSV_KEY). It returns no payment data — just what's needed to credit
// the free nights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/** Free nights are valid for 3 months from the booking date. */
const FREE_NIGHTS_VALID_MONTHS = 3;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection. Only = and @ actually trigger a
  // formula on import; + and - are excluded so phone numbers ("+44 …") don't
  // pick up a visible leading apostrophe on every row.
  const safe = /^[=@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp when the target month is shorter (e.g. 31 Jan + 1mo).
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const expected = Deno.env.get("CREATOR_CSV_KEY") ?? "";
  if (!expected || key !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return new Response("not configured", { status: 503 });
  const sb = createClient(sbUrl, sbKey);

  const { data: codes, error: cErr } = await sb
    .from("discount_codes")
    .select("id,code,creator_name")
    .eq("is_creator", true);
  if (cErr) return new Response(`error: ${cErr.message}`, { status: 500 });
  const codeById = new Map(
    (codes ?? []).map((c) => [String(c.id), { code: String(c.code), creator: String(c.creator_name || c.code) }]),
  );
  if (codeById.size === 0) {
    return new Response("", { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  const { data: rows, error } = await sb
    .from("bookings")
    .select("booking_ref,lead_name,lead_email,lead_phone,group_size,status,created_at,stripe_session_id,id,discount_code_id,spot_number,trips(name,days),departures(departure_date)")
    .in("discount_code_id", Array.from(codeById.keys()))
    .neq("status", "Cancelled")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return new Response(`error: ${error.message}`, { status: 500 });

  const header = [
    "Booked At", "Booking Ref", "Guest Name", "Email", "Phone",
    "Code", "Creator", "Trip", "Duration", "Departure Date", "Spots", "Free Nights Expire",
  ];
  const lines = [header.map(csvCell).join(",")];

  // One row per checkout — the lead booker is who gets the free nights.
  const seen = new Set<string>();
  for (const b of rows ?? []) {
    const dedupe = String(b.stripe_session_id || b.id);
    if (seen.has(dedupe)) continue;
    if (Number(b.spot_number ?? 1) !== 1) continue;
    seen.add(dedupe);

    const meta = codeById.get(String(b.discount_code_id));
    if (!meta) continue;
    const trip = (b.trips as { name?: string; days?: number } | null) ?? {};
    const days = Number(trip.days ?? 0);
    const bookedAt = String(b.created_at ?? "").slice(0, 10);

    lines.push([
      bookedAt,
      b.booking_ref ?? "",
      b.lead_name ?? "",
      b.lead_email ?? "",
      b.lead_phone ?? "",
      meta.code,
      meta.creator,
      trip.name ?? "",
      days ? `${days} days` : "",
      (b.departures as { departure_date?: string } | null)?.departure_date ?? "",
      b.group_size ?? 1,
      bookedAt ? addMonths(bookedAt, FREE_NIGHTS_VALID_MONTHS) : "",
    ].map(csvCell).join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // Sheets re-fetches periodically; let it cache briefly.
      "Cache-Control": "public, max-age=300",
    },
  });
});
