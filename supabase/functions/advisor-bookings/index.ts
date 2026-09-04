// Adventure Advisors poll endpoint (Dhany's step 4, agreed 3 Sep 2026).
//
// Their server calls this with a shared key and the `aa` tokens it has
// issued; we answer with what each token sold. One entry per checkout, not
// per traveller row, because that is the unit an advisor thinks in ("that
// link made one sale of two spots"). Deposit and balance state come along so
// their dashboard can show paid / owing without reading Stripe.
//
// No guest names, emails or phones leave here: the advisor already knows who
// they sent, we only confirm what was bought. Same stance as staff-leaderboard.
//
// The key lives in app_config('advisor_api_key'); rotate it with one UPDATE.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TOKEN = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_TOKENS = 200;
const MAX_ROWS = 5000;

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Same-length, constant-time compare so a wrong key costs the same as a right one.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const money = (v: number) => Math.round(v * 100) / 100;

type Row = {
  id: string;
  advisor_ref: string | null;
  stripe_session_id: string | null;
  booking_ref: string | null;
  trip_id: string | null;
  departure_id: string | null;
  spot_number: number | null;
  group_size: number | null;
  status: string | null;
  final_price: number | null;
  original_price: number | null;
  discount_amount: number | null;
  amount_paid: number | null;
  balance_amount: number | null;
  balance_status: string | null;
  balance_due_date: string | null;
  balance_charged_at: string | null;
  balance_next_attempt_at: string | null;
  balance_last_error: string | null;
  stripe_refund_id: string | null;
  stripe_balance_refund_id: string | null;
  created_at: string;
  updated_at: string | null;
};

// One word Dhany's side can switch on. Everything it is derived from is
// returned too, so nothing is hidden behind the label.
function paymentState(r: Row, cancelled: boolean) {
  if (cancelled) return r.stripe_refund_id || r.stripe_balance_refund_id ? "refunded" : "cancelled";
  const owing = num(r.balance_amount) > 0 && r.balance_status !== "charged";
  if (!owing) return "paid_in_full";
  if (r.balance_status === "failed") return "balance_failed";
  if (r.balance_status === "failed_final") return "balance_failed_final";
  return "deposit_paid";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ error: "POST only" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Backend not configured" }, 503);
    const sb = createClient(url, key);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return jr({ error: "Invalid JSON" }, 400);
    }

    // Key in the x-advisor-key header, or `key` in the body for clients that
    // cannot set headers.
    const presented = (req.headers.get("x-advisor-key") ?? (typeof body.key === "string" ? body.key : "")).trim();
    if (!presented) return jr({ error: "Key required (x-advisor-key header)" }, 401);
    const { data: cfg, error: cfgErr } = await sb
      .from("app_config")
      .select("value")
      .eq("key", "advisor_api_key")
      .maybeSingle();
    if (cfgErr || !cfg?.value) return jr({ error: "Endpoint unavailable" }, 503);
    if (!safeEqual(presented, String(cfg.value).trim())) return jr({ error: "Wrong key" }, 401);

    const rawTokens = Array.isArray(body.tokens) ? body.tokens : [];
    const tokens = [...new Set(rawTokens.filter((t): t is string => typeof t === "string" && TOKEN.test(t)))];
    if (!tokens.length) return jr({ error: "tokens required: an array of aa tokens ([A-Za-z0-9_-], 1-32 chars each)" }, 400);
    if (tokens.length > MAX_TOKENS) return jr({ error: `Max ${MAX_TOKENS} tokens per call` }, 400);
    const since =
      typeof body.since === "string" && !Number.isNaN(Date.parse(body.since))
        ? new Date(body.since).toISOString()
        : null;

    let q = sb
      .from("bookings")
      .select(
        "id,advisor_ref,stripe_session_id,booking_ref,trip_id,departure_id,spot_number,group_size,status," +
          "final_price,original_price,discount_amount,amount_paid,balance_amount,balance_status,balance_due_date," +
          "balance_charged_at,balance_next_attempt_at,balance_last_error,stripe_refund_id,stripe_balance_refund_id," +
          "created_at,updated_at",
      )
      .in("advisor_ref", tokens)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (since) q = q.gte("updated_at", since);
    const { data, error } = await q;
    if (error) return jr({ error: error.message }, 500);
    const rows = (data ?? []) as unknown as Row[];

    const tripIds = [...new Set(rows.map((r) => r.trip_id).filter((v): v is string => Boolean(v)))];
    const depIds = [...new Set(rows.map((r) => r.departure_id).filter((v): v is string => Boolean(v)))];
    const [tripsRes, depsRes] = await Promise.all([
      tripIds.length ? sb.from("trips").select("id,slug,name").in("id", tripIds) : Promise.resolve({ data: [] as { id: string; slug: string; name: string }[] }),
      depIds.length
        ? sb.from("departures").select("id,departure_date,status").in("id", depIds)
        : Promise.resolve({ data: [] as { id: string; departure_date: string; status: string }[] }),
    ]);
    const trips = new Map((tripsRes.data ?? []).map((t) => [t.id, t]));
    const deps = new Map((depsRes.data ?? []).map((d) => [d.id, d]));

    // One checkout = one sale. Rows share a stripe_session_id.
    const bySession = new Map<string, Row[]>();
    for (const r of rows) {
      const k = r.stripe_session_id || r.id;
      const g = bySession.get(k);
      if (g) g.push(r);
      else bySession.set(k, [r]);
    }

    const bookings = [];
    const summary: Record<string, { bookings: number; spots: number; paid: number; owing: number }> = {};
    for (const t of tokens) summary[t] = { bookings: 0, spots: 0, paid: 0, owing: 0 };

    for (const group of bySession.values()) {
      group.sort((a, b) => num(a.spot_number) - num(b.spot_number));
      const lead = group[0];
      const active = group.filter((r) => String(r.status ?? "") !== "Cancelled");
      const cancelled = active.length === 0;
      const spots = cancelled ? 0 : active.length;
      const ref = cancelled ? lead : active[0];
      const state = paymentState(ref, cancelled);
      const owing = state === "deposit_paid" || state === "balance_failed" || state === "balance_failed_final";
      const perSpotFinal = num(ref.final_price);
      const perSpotPaid = num(ref.amount_paid);
      const perSpotBalance = owing ? num(ref.balance_amount) : 0;
      const trip = lead.trip_id ? trips.get(lead.trip_id) : undefined;
      const dep = lead.departure_id ? deps.get(lead.departure_id) : undefined;
      const updatedAt = group.reduce((m, r) => (r.updated_at && r.updated_at > m ? r.updated_at : m), lead.updated_at ?? lead.created_at);

      const aa = String(lead.advisor_ref ?? "");
      const paid = money(perSpotPaid * spots);
      const balanceDue = money(perSpotBalance * spots);
      bookings.push({
        aa,
        bookingRef: lead.booking_ref,
        createdAt: lead.created_at,
        updatedAt,
        trip: trip ? { slug: trip.slug, name: trip.name } : null,
        departure: dep ? { date: dep.departure_date, status: dep.status } : null,
        spots,
        spotsBooked: group.length,
        status: cancelled ? "cancelled" : "confirmed",
        paymentState: state,
        payment: {
          currency: "USD",
          pricePerSpot: money(perSpotFinal),
          total: money(perSpotFinal * spots),
          paid,
          balanceDue,
          balanceDueDate: owing ? ref.balance_due_date : null,
          balanceStatus: ref.balance_status,
          balanceChargedAt: ref.balance_charged_at,
          balanceNextAttemptAt: owing ? ref.balance_next_attempt_at : null,
          balanceLastError: owing ? ref.balance_last_error : null,
        },
      });
      const s = summary[aa];
      if (s) {
        if (!cancelled) s.bookings += 1;
        s.spots += spots;
        s.paid = money(s.paid + paid);
        s.owing = money(s.owing + balanceDue);
      }
    }

    return jr({ ok: true, generatedAt: new Date().toISOString(), since, tokens, bookings, summary });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
