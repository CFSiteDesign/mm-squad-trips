// Quarterly creator-code prize draw.
//
// Cron calls this on the 1st of every month; it only acts in Aug / Nov / Feb /
// May (quarters starting 1 Aug 2026). Each draw picks TWO winners from bookings
// made with a creator code during the preceding quarter:
//   • one from trips under 10 days
//   • one from trips of 10+ days
// Winners are emailed to Lexie + Cai so they can notify the guests personally.
//
// Idempotent: prize_draws has a unique index on (period_start, period_end,
// bracket), so a re-run for the same quarter is a no-op. Previous winners are
// excluded from later draws.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

/** Draws happen at the start of these months (0-indexed): Feb, May, Aug, Nov. */
const DRAW_MONTHS = [1, 4, 7, 10];
const DRAW_RECIPIENTS = ["lexie@madmonkeyhostels.com", "cai@madmonkeyhostels.com"];
/** Set DRAW_RECIPIENTS_OVERRIDE (comma-separated) to divert draw emails when
 *  rehearsing a draw, so the real recipients aren't sent test winners. */
function drawRecipients(): string[] {
  const override = (Deno.env.get("DRAW_RECIPIENTS_OVERRIDE") ?? "").trim();
  if (!override) return DRAW_RECIPIENTS;
  return override.split(",").map((s) => s.trim()).filter(Boolean);
}
/** Trips shorter than this many days go in the "short" bracket. */
const SHORT_TRIP_MAX_DAYS = 10;

const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Cryptographically random index in [0, n). */
function randomIndex(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

type Entrant = {
  id: string; ref: string; name: string; email: string; phone: string;
  code: string; creator: string; trip: string; days: number; departure: string; bookedAt: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return new Response("not configured", { status: 503, headers: corsHeaders });
  const sb = createClient(sbUrl, sbKey);

  // Fail-closed cron guard (same model as the other scheduled functions).
  const provided = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) return new Response("cron secret unavailable", { status: 503, headers: corsHeaders });
  const cronSecret = normalizeCronSecret(typeof vaultSecret === "string" ? vaultSecret : null);
  if (!cronSecret || provided !== cronSecret) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1"; // manual/test run

  const now = new Date();
  if (!force && !DRAW_MONTHS.includes(now.getUTCMonth())) {
    return jr({ ok: true, skipped: `not a draw month (${now.getUTCMonth() + 1})` });
  }

  // The quarter that just ended: the 3 months before this month.
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodStart = new Date(periodEnd);
  periodStart.setUTCMonth(periodStart.getUTCMonth() - 3);
  const startIso = periodStart.toISOString().slice(0, 10);
  const endIso = periodEnd.toISOString().slice(0, 10); // exclusive

  // Creator codes
  const { data: codes } = await sb
    .from("discount_codes").select("id,code,creator_name").eq("is_creator", true);
  const codeById = new Map(
    (codes ?? []).map((c) => [String(c.id), { code: String(c.code), creator: String(c.creator_name || c.code) }]),
  );
  if (codeById.size === 0) return jr({ ok: true, skipped: "no creator codes" });

  // Everyone who has already won — never win twice.
  const { data: pastWinners } = await sb.from("prize_draws").select("booking_id,guest_email");
  const wonBookingIds = new Set((pastWinners ?? []).map((w) => String(w.booking_id ?? "")));
  const wonEmails = new Set((pastWinners ?? []).map((w) => String(w.guest_email ?? "").toLowerCase()));

  const { data: rows, error } = await sb
    .from("bookings")
    .select("id,booking_ref,lead_name,lead_email,lead_phone,group_size,status,created_at,stripe_session_id,discount_code_id,spot_number,trips(name,days),departures(departure_date)")
    .in("discount_code_id", Array.from(codeById.keys()))
    .neq("status", "Cancelled")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .limit(5000);
  if (error) return jr({ error: error.message }, 500);

  const seen = new Set<string>();
  const short: Entrant[] = [];
  const long: Entrant[] = [];
  for (const b of rows ?? []) {
    if (Number(b.spot_number ?? 1) !== 1) continue;
    const dedupe = String(b.stripe_session_id || b.id);
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    if (wonBookingIds.has(String(b.id))) continue;
    if (wonEmails.has(String(b.lead_email ?? "").toLowerCase())) continue;

    const meta = codeById.get(String(b.discount_code_id));
    if (!meta) continue;
    const trip = (b.trips as { name?: string; days?: number } | null) ?? {};
    const days = Number(trip.days ?? 0);
    const e: Entrant = {
      id: String(b.id),
      ref: String(b.booking_ref ?? ""),
      name: String(b.lead_name ?? ""),
      email: String(b.lead_email ?? ""),
      phone: String(b.lead_phone ?? ""),
      code: meta.code,
      creator: meta.creator,
      trip: String(trip.name ?? ""),
      days,
      departure: String((b.departures as { departure_date?: string } | null)?.departure_date ?? ""),
      bookedAt: String(b.created_at ?? "").slice(0, 10),
    };
    (days > 0 && days < SHORT_TRIP_MAX_DAYS ? short : long).push(e);
  }

  const results: Record<string, unknown>[] = [];
  const winners: { bracket: string; label: string; e: Entrant; pool: number }[] = [];

  for (const [bracket, pool, label] of [
    ["short", short, `Under ${SHORT_TRIP_MAX_DAYS} days`],
    ["long", long, `${SHORT_TRIP_MAX_DAYS}+ days`],
  ] as const) {
    if (pool.length === 0) {
      results.push({ bracket, skipped: "no entries" });
      continue;
    }
    const e = pool[randomIndex(pool.length)];
    const { error: insErr } = await sb.from("prize_draws").insert({
      period_start: startIso, period_end: endIso, bracket,
      booking_id: e.id, booking_ref: e.ref, guest_name: e.name, guest_email: e.email,
      code: e.code, creator_name: e.creator, trip_name: e.trip, trip_days: e.days,
      entries_in_pool: pool.length,
    });
    if (insErr) {
      // Unique index hit = this quarter/bracket was already drawn.
      results.push({ bracket, skipped: "already drawn this quarter" });
      continue;
    }
    winners.push({ bracket, label, e, pool: pool.length });
    results.push({ bracket, winner: e.ref, pool: pool.length });
  }

  if (winners.length > 0) {
    const card = (w: typeof winners[number]) => `
<div style="margin:0 0 18px 0;padding:16px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em">${esc(w.label)} — winner</div>
<div style="font-size:22px;font-weight:900;margin-top:6px">${esc(w.e.name)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:14px">
<tr><td style="padding:3px 0"><strong>Email</strong></td><td style="padding:3px 0">${esc(w.e.email)}</td></tr>
<tr><td style="padding:3px 0"><strong>Phone</strong></td><td style="padding:3px 0">${esc(w.e.phone)}</td></tr>
<tr><td style="padding:3px 0"><strong>Booking ref</strong></td><td style="padding:3px 0">${esc(w.e.ref)}</td></tr>
<tr><td style="padding:3px 0"><strong>Trip</strong></td><td style="padding:3px 0">${esc(w.e.trip)} (${esc(w.e.days)} days), departs ${esc(w.e.departure)}</td></tr>
<tr><td style="padding:3px 0"><strong>Creator code</strong></td><td style="padding:3px 0">${esc(w.e.code)} — ${esc(w.e.creator)}</td></tr>
<tr><td style="padding:3px 0"><strong>Drawn from</strong></td><td style="padding:3px 0">${w.pool} entr${w.pool === 1 ? "y" : "ies"}</td></tr>
</table></div>`;

    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5efe2;font-family:Montserrat,Arial,sans-serif;color:#0a0a0a">
<div style="max-width:600px;margin:0 auto;background:#fff;border:2px solid #0a0a0a;box-shadow:8px 8px 0 #0a0a0a;padding:24px">
<h1 style="margin:0 0 6px 0;font-size:26px;font-weight:900;text-transform:uppercase">🎟️ Prize draw — winners</h1>
<p style="margin:0 0 18px 0;font-size:14px;color:#555">Quarter ${esc(startIso)} → ${esc(endIso)} (bookings made with a creator code)</p>
${winners.map(card).join("")}
<p style="margin:18px 0 0 0;font-size:14px">Please notify the winners personally. Each wins a 7-Day Indonesia ALL IN Trip.</p>
<p style="margin:10px 0 0 0;font-size:12px;color:#777">Winners are picked at random and recorded, so nobody can win twice.</p>
</div></body></html>`;

    try {
      await sendEmail({
        to: drawRecipients(),
        subject: `🎟️ Prize draw winners — ${startIso} to ${endIso}`,
        html,
        templateName: "quarterly_prize_draw",
      });
      await sb.from("prize_draws").update({ notified: true })
        .eq("period_start", startIso).eq("period_end", endIso);
    } catch (e) {
      console.error("draw email failed", e instanceof Error ? e.message : e);
    }
  }

  return jr({ ok: true, period: { start: startIso, end: endIso }, results });
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
