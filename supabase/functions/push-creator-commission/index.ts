// Pushes each creator code's ALL IN trips commission to the Revenue Hub
// (mm-influencer-rev), where creators view their earnings. One row per
// creator code per month, POSTed to the hub's add-trip-commission endpoint.
//
// Commission rules (affiliate brief + Cai 27 Jul):
// - flat fee per booking: commission_7day (trips ≤10 days) / commission_12day
//   (trips over 10 days)
// - confirmed only when the trip is locked in: fully paid AND departure
//   confirmed AND past the 30-day cancellation checkpoint — a fully-paid
//   booking that can still be cancelled stays pending
// - cancellations earn nothing
// - a booking counts in the month it was made (Australia/Brisbane)
//
// Trigger: POST with x-cron-secret vs the Vault CRON_SECRET (same guard as
// charge-trip-balances) — fired by stripe-webhook after checkout/balance
// events, by cancellations, and by the nightly resync. Pushes ALL months
// that have ever had a creator booking, so corrections propagate.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const normalizeCronSecret = (value: string | null) => {
  if (value == null) return "";
  const trimmed = value.trim();
  return /^[0-9A-Fa-f]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

const LONG_TRIP_MIN_DAYS = 11; // >10 days = the commission_12day tier
const CANCEL_WINDOW_DAYS = 30; // underfilled departures cancel at 30 days out

type CommissionState = "confirmed" | "pending" | "void";

function commissionState(
  b: Record<string, unknown>,
  dep?: { status: string; date: string },
): CommissionState {
  if (String(b.status ?? "") === "Cancelled") return "void";
  const bal = String(b.balance_status ?? "");
  if (bal === "cancelled" || bal === "failed_final") return "void";
  const fullyPaid =
    bal === "charged" || bal === "not_required" || String(b.payment_type ?? "") === "Full";
  if (!fullyPaid) return "pending";
  if (!dep || dep.status !== "confirmed" || !dep.date) return "pending";
  const cutoff = new Date(dep.date + "T00:00:00Z").getTime() - CANCEL_WINDOW_DAYS * 86400_000;
  return Date.now() >= cutoff ? "confirmed" : "pending";
}

function brisbaneMonth(iso: string): string {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
  return MONTHS[d.getMonth()];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);
  const sb = createClient(url, key);

  // Same Vault-backed guard as charge-trip-balances — one secret, one source
  // of truth, so the existing cron infrastructure can call this too.
  const provided = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) return jr({ error: "cron secret unavailable" }, 503);
  const cronSecret = normalizeCronSecret(typeof vaultSecret === "string" ? vaultSecret : null);
  if (!cronSecret || provided !== cronSecret) return jr({ error: "forbidden" }, 403);

  const hubUrl = Deno.env.get("REVENUE_HUB_URL") ??
    "https://jtiawsakiidtfobophyv.supabase.co/functions/v1/add-trip-commission";
  const hubSecret = Deno.env.get("ALLIN_TRIPS_API_SECRET");
  if (!hubSecret) return jr({ error: "ALLIN_TRIPS_API_SECRET not set" }, 503);

  const { data: codes, error: cErr } = await sb
    .from("discount_codes")
    .select("id,code,commission_7day,commission_12day")
    .eq("is_creator", true);
  if (cErr) return jr({ error: cErr.message }, 500);
  const byId = new Map((codes ?? []).map((c) => [String(c.id), c]));
  if (!byId.size) return jr({ ok: true, pushed: 0, note: "no creator codes" });

  const { data: trips } = await sb.from("trips").select("id,days");
  const tripDays = new Map((trips ?? []).map((t) => [String(t.id), Number(t.days ?? 0)]));

  const { data: deps } = await sb.from("departures").select("id,status,departure_date");
  const depById = new Map(
    (deps ?? []).map((d) => [String(d.id), { status: String(d.status ?? ""), date: String(d.departure_date ?? "") }]),
  );

  const { data: bookings, error: bErr } = await sb
    .from("bookings")
    .select("discount_code_id,trip_id,departure_id,status,payment_type,balance_status,stripe_session_id,id,created_at")
    .in("discount_code_id", Array.from(byId.keys()))
    .limit(10000);
  if (bErr) return jr({ error: bErr.message }, 500);

  // Aggregate per code per month, deduped per checkout (lead row + members
  // share one stripe_session_id — one booking, one commission).
  const agg = new Map<string, { code: string; month: string; bookings: number; confirmed: number; pending: number }>();
  const seen = new Set<string>();
  for (const b of bookings ?? []) {
    const dedupe = String(b.stripe_session_id || b.id);
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const state = commissionState(b, depById.get(String(b.departure_id)));
    if (state === "void") continue;
    const codeRow = byId.get(String(b.discount_code_id))!;
    const month = brisbaneMonth(String(b.created_at));
    const days = tripDays.get(String(b.trip_id)) ?? 0;
    const rate = days > 0 && days < LONG_TRIP_MIN_DAYS
      ? Number(codeRow.commission_7day ?? 25)
      : Number(codeRow.commission_12day ?? 50);
    const k = `${codeRow.code}|${month}`;
    const a = agg.get(k) ?? { code: String(codeRow.code), month, bookings: 0, confirmed: 0, pending: 0 };
    a.bookings += 1;
    if (state === "confirmed") a.confirmed += rate; else a.pending += rate;
    agg.set(k, a);
  }

  const payload = Array.from(agg.values()).map((a) => ({
    code: a.code, month: a.month, bookings: a.bookings,
    commission_confirmed: a.confirmed, commission_pending: a.pending,
  }));
  if (!payload.length) return jr({ ok: true, pushed: 0, note: "no creator bookings yet" });

  const res = await fetch(hubUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-secret": hubSecret },
    body: JSON.stringify(payload),
  });
  const hubResult = await res.json().catch(() => ({}));
  if (!res.ok) return jr({ error: "Revenue Hub rejected push", status: res.status, hubResult }, 502);

  return jr({ ok: true, pushed: payload.length, hubResult });
});
