// ALL IN bookings for the guest's Loyalty account (Dhany's page, 15 Oct 2026).
//
// The Loyalty page shows a guest where to be on each day of their trip, so it
// needs every data point we take at checkout plus the WhatsApp consent. Dhany's
// server calls this with a shared key and the logged-in guest's email; we
// answer with every ALL IN booking that email is on (as the lead booker or as
// a named traveller), read live, so balance charges, cancellations and date
// changes show up straight away. `since` alone lists every booking changed
// since then, for a bulk sync.
//
// One entry per checkout. Stripe ids, GA ids and internal errors stay here.
// The key lives in app_config('loyalty_api_key'); rotate it with one UPDATE.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_EMAILS = 100;
const MAX_ROWS = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nights per trip, which set the end date (start + nights). Mirrors
// src/data/trips.ts; anything not listed falls back to the trip's days.
const NIGHTS: Record<string, number> = {
  "indonesia-7": 7,
  "vietnam-7": 7,
  indonesia: 12,
  cambodia: 14,
  vietnam: 13,
  thailand: 10,
  laos: 9,
};

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
const lower = (v: unknown) => String(v ?? "").trim().toLowerCase();
const blank = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());

function plusDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Traveller = { name?: string; email?: string; age?: string; dietary?: string };
type Row = {
  id: string;
  booking_ref: string | null;
  stripe_session_id: string | null;
  trip_id: string | null;
  departure_id: string | null;
  booking_type: string | null;
  spot_number: number | null;
  group_size: number | null;
  status: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_country: string | null;
  lead_age: number | null;
  lead_solo: boolean | null;
  lead_source: string | null;
  traveller_mode: string | null;
  additional_travelers: Traveller[] | null;
  friend_names_mentioned: string | null;
  staff_recommendation: string | null;
  payment_type: string | null;
  original_price: number | null;
  discount_code_id: string | null;
  discount_amount: number | null;
  final_price: number | null;
  amount_paid: number | null;
  balance_amount: number | null;
  balance_status: string | null;
  balance_due_date: string | null;
  balance_charged_at: string | null;
  stripe_refund_id: string | null;
  stripe_balance_refund_id: string | null;
  whatsapp_opt_in: boolean | null;
  whatsapp_opt_in_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  advisor_ref: string | null;
  created_at: string;
  updated_at: string | null;
};

const COLS =
  "id,booking_ref,stripe_session_id,trip_id,departure_id,booking_type,spot_number,group_size,status," +
  "lead_name,lead_email,lead_phone,lead_country,lead_age,lead_solo,lead_source,traveller_mode,additional_travelers," +
  "friend_names_mentioned,staff_recommendation,payment_type,original_price,discount_code_id,discount_amount," +
  "final_price,amount_paid,balance_amount,balance_status,balance_due_date,balance_charged_at," +
  "stripe_refund_id,stripe_balance_refund_id,whatsapp_opt_in,whatsapp_opt_in_at," +
  "utm_source,utm_medium,utm_campaign,utm_content,advisor_ref,created_at,updated_at";

// The Experience Database's allin-sync signs its requests instead of sending the key (19 Oct 2026): ECDSA P-256
// over "<timestamp>.<raw body>", checked with app_config('experience_db_public_jwk'). The private key never leaves
// the Experience Database, so no password is shared between the two systems. Five minutes either side.
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
async function signedByExperienceDb(req: Request, raw: string, publicJwk: string | null): Promise<boolean> {
  const ts = req.headers.get("x-mmx-timestamp") ?? "";
  const sig = req.headers.get("x-mmx-signature") ?? "";
  if (!/^\d{9,11}$/.test(ts) || !sig || !publicJwk) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("jwk", JSON.parse(publicJwk), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, fromB64url(sig), new TextEncoder().encode(`${ts}.${raw}`));
  } catch {
    return false;
  }
}

// One word the page can switch on. Same states as advisor-bookings.
function paymentState(lead: Row, cancelled: boolean) {
  if (cancelled) return lead.stripe_refund_id || lead.stripe_balance_refund_id ? "refunded" : "cancelled";
  const owing = num(lead.balance_amount) > 0 && lead.balance_status !== "charged";
  if (!owing) return "paid_in_full";
  if (lead.balance_status === "failed") return "balance_failed";
  if (lead.balance_status === "failed_final") return "balance_failed_final";
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

    // Raw text first: the Experience DB signature covers the exact bytes sent.
    const raw = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return jr({ error: "Invalid JSON" }, 400);
    }

    // Key in the x-loyalty-key header, or `key` in the body for clients that
    // cannot set headers.
    const signed = req.headers.has("x-mmx-signature")
      ? await signedByExperienceDb(
          req,
          raw,
          ((await sb.from("app_config").select("value").eq("key", "experience_db_public_jwk").maybeSingle()).data?.value as string | undefined) ?? null,
        )
      : false;
    if (!signed) {
      const presented = (req.headers.get("x-loyalty-key") ?? (typeof body.key === "string" ? body.key : "")).trim();
      if (!presented) return jr({ error: "Key required (x-loyalty-key header)" }, 401);
      const { data: cfg, error: cfgErr } = await sb
        .from("app_config")
        .select("value")
        .eq("key", "loyalty_api_key")
        .maybeSingle();
      if (cfgErr || !cfg?.value) return jr({ error: "Endpoint unavailable" }, 503);
      if (!safeEqual(presented, String(cfg.value).trim())) return jr({ error: "Wrong key" }, 401);
    }

    const rawEmails = [
      ...(typeof body.email === "string" ? [body.email] : []),
      ...(Array.isArray(body.emails) ? body.emails : []),
    ];
    const emails = [...new Set(rawEmails.filter((e): e is string => typeof e === "string").map(lower).filter((e) => EMAIL.test(e)))];
    if (emails.length > MAX_EMAILS) return jr({ error: `Max ${MAX_EMAILS} emails per call` }, 400);
    const since =
      typeof body.since === "string" && !Number.isNaN(Date.parse(body.since))
        ? new Date(body.since).toISOString()
        : null;
    if (!emails.length && !since) {
      return jr({ error: "Send email (or emails: [...]) for a guest's bookings, or since (ISO time) for every booking changed since then" }, 400);
    }

    // Lead rows for the asked-for guests: as lead booker (case-insensitive) or
    // named on someone else's booking (additional_travelers on the lead row).
    const leadRows: Row[] = [];
    if (emails.length) {
      const byLead = await Promise.all(
        emails.map((e) =>
          sb.from("bookings").select(COLS).eq("spot_number", 1).ilike("lead_email", e.replace(/[\\%_]/g, (c) => `\\${c}`)),
        ),
      );
      const byTraveller = await Promise.all(
        // jsonb containment: supabase-js sends an array as a Postgres array
        // literal, so the JSON goes as a string.
        emails.map((e) =>
          sb.from("bookings").select(COLS).eq("spot_number", 1).contains("additional_travelers", JSON.stringify([{ email: e }])),
        ),
      );
      for (const r of [...byLead, ...byTraveller]) {
        if (r.error) return jr({ error: r.error.message }, 500);
        leadRows.push(...((r.data ?? []) as unknown as Row[]));
      }
    } else {
      // A booking counts as changed when any of its rows changed.
      const { data: changed, error } = await sb
        .from("bookings")
        .select("stripe_session_id,booking_ref")
        .gte("updated_at", since!)
        .limit(MAX_ROWS);
      if (error) return jr({ error: error.message }, 500);
      const refs = [...new Set((changed ?? []).map((r) => r.booking_ref as string).filter(Boolean))];
      for (let i = 0; i < refs.length; i += 200) {
        const { data, error: e2 } = await sb.from("bookings").select(COLS).eq("spot_number", 1).in("booking_ref", refs.slice(i, i + 200));
        if (e2) return jr({ error: e2.message }, 500);
        leadRows.push(...((data ?? []) as unknown as Row[]));
      }
    }
    const leads = [...new Map(leadRows.map((r) => [r.id, r])).values()];
    if (!leads.length) return jr({ bookings: [], count: 0 });

    // Every row of those bookings (one per spot), plus trips, departures, codes.
    const refs = [...new Set(leads.map((l) => l.booking_ref).filter((v): v is string => Boolean(v)))];
    const spotRows: Row[] = [];
    for (let i = 0; i < refs.length; i += 200) {
      const { data, error } = await sb
        .from("bookings")
        .select("booking_ref,spot_number,status,updated_at,final_price,amount_paid")
        .in("booking_ref", refs.slice(i, i + 200));
      if (error) return jr({ error: error.message }, 500);
      spotRows.push(...((data ?? []) as unknown as Row[]));
    }
    const tripIds = [...new Set(leads.map((r) => r.trip_id).filter((v): v is string => Boolean(v)))];
    const depIds = [...new Set(leads.map((r) => r.departure_id).filter((v): v is string => Boolean(v)))];
    const codeIds = [...new Set(leads.map((r) => r.discount_code_id).filter((v): v is string => Boolean(v)))];
    const sessions = [...new Set(leads.map((r) => r.stripe_session_id).filter((v): v is string => Boolean(v)))];
    const [tripsRes, depsRes, codesRes, squadRes] = await Promise.all([
      tripIds.length ? sb.from("trips").select("id,slug,name,days").in("id", tripIds) : Promise.resolve({ data: [] }),
      depIds.length ? sb.from("departures").select("id,departure_date,status").in("id", depIds) : Promise.resolve({ data: [] }),
      codeIds.length ? sb.from("discount_codes").select("id,code,is_creator").in("id", codeIds) : Promise.resolve({ data: [] }),
      sessions.length
        ? sb.from("squad_bookings").select("stripe_session_id,squad_leaders(code)").in("stripe_session_id", sessions)
        : Promise.resolve({ data: [] }),
    ]);
    type Trip = { id: string; slug: string; name: string; days: number | null };
    type Dep = { id: string; departure_date: string; status: string | null };
    type Code = { id: string; code: string; is_creator: boolean | null };
    const trips = new Map(((tripsRes.data ?? []) as Trip[]).map((t) => [t.id, t]));
    const deps = new Map(((depsRes.data ?? []) as Dep[]).map((d) => [d.id, d]));
    const codes = new Map(((codesRes.data ?? []) as Code[]).map((c) => [c.id, c]));
    const squadBySession = new Map(
      ((squadRes.data ?? []) as Array<{ stripe_session_id: string; squad_leaders: { code: string } | { code: string }[] | null }>).map((s) => {
        const l = Array.isArray(s.squad_leaders) ? s.squad_leaders[0] : s.squad_leaders;
        return [s.stripe_session_id, l?.code ?? null];
      }),
    );

    const asked = new Set(emails);
    const out = leads.map((lead) => {
      const trip = lead.trip_id ? trips.get(lead.trip_id) : undefined;
      const dep = lead.departure_id ? deps.get(lead.departure_id) : undefined;
      const spots = spotRows.filter((r) => r.booking_ref === lead.booking_ref);
      const cancelled = lower(lead.status) === "cancelled" || lower(dep?.status) === "cancelled";
      const size = Math.max(1, num(lead.group_size) || spots.length || 1);
      const slug = trip?.slug ?? null;
      const nights = (slug && NIGHTS[slug]) ?? num(trip?.days);
      const start = dep?.departure_date ?? null;
      const [first, ...rest] = String(lead.lead_name ?? "").trim().split(/\s+/);
      const extras = Array.isArray(lead.additional_travelers) ? lead.additional_travelers : [];
      const code = lead.discount_code_id ? codes.get(lead.discount_code_id) : undefined;
      const squadCode = lead.stripe_session_id ? squadBySession.get(lead.stripe_session_id) ?? null : null;
      const perSpotBalance = lead.balance_status === "charged" ? 0 : num(lead.balance_amount);
      // Summed over the spot rows: a squad reward refund only moves the lead's row.
      const live = spots.length ? spots : [lead];
      const sum = (k: "final_price" | "amount_paid") => money(live.reduce((t, r) => t + num(r[k]), 0));
      const updated = [lead.updated_at, ...spots.map((s) => s.updated_at)].filter(Boolean).sort().pop() ?? lead.created_at;
      const leadEmail = lower(lead.lead_email);
      return {
        booking_ref: lead.booking_ref,
        booking_id: lead.id,
        // For an email lookup: whether that guest is the lead booker or a named traveller.
        role: emails.length ? (asked.has(leadEmail) ? "lead" : "traveller") : undefined,
        status: cancelled ? "cancelled" : "confirmed",
        payment_state: paymentState(lead, cancelled),
        booked_at: lead.created_at,
        updated_at: updated,
        trip: {
          slug,
          name: trip?.name ?? null,
          country: slug ? slug.split("-")[0].replace(/^./, (c) => c.toUpperCase()) : null,
          days: trip?.days ?? null,
          nights: nights || null,
        },
        departure: {
          date: start,
          end_date: start && nights ? plusDays(start, nights) : null,
          status: dep?.status ?? null,
        },
        spots: size,
        traveller_mode: blank(lead.traveller_mode),
        solo: lead.lead_solo === true,
        lead: {
          name: blank(lead.lead_name),
          first_name: blank(first),
          last_name: blank(rest.join(" ")),
          email: blank(lead.lead_email),
          phone: blank(lead.lead_phone),
          country: blank(lead.lead_country),
          age: lead.lead_age ?? null,
        },
        whatsapp: {
          opt_in: lead.whatsapp_opt_in === true,
          opted_in_at: lead.whatsapp_opt_in_at,
          // The checkout box: "Keep me posted on WhatsApp. We'll send your
          // day-by-day schedule, pickup times and anything you need before you
          // go. Trip updates only. Opt out anytime." Not marketing consent.
          scope: "trip_updates",
          phone: blank(lead.lead_phone),
        },
        // Spot 1 is the lead booker. Other spots carry what the checkout asked
        // for them (the student pages ask name, email, age and dietary needs;
        // the main trip pages ask nothing per traveller).
        travellers: Array.from({ length: size }, (_, i) => {
          if (i === 0) {
            return { spot: 1, is_lead: true, name: blank(lead.lead_name), email: blank(lead.lead_email), age: lead.lead_age ?? null, dietary: null };
          }
          const t = extras[i - 1] ?? {};
          const row = spots.find((s) => num(s.spot_number) === i + 1);
          return {
            spot: i + 1,
            is_lead: false,
            name: blank(t.name),
            email: blank(t.email),
            age: blank(t.age) != null ? Number(t.age) || blank(t.age) : null,
            dietary: blank(t.dietary),
            cancelled: row ? lower(row.status) === "cancelled" : false,
          };
        }),
        payment: {
          currency: "USD",
          type: lower(lead.payment_type) === "deposit" ? "deposit" : "full",
          price_per_spot: money(num(lead.original_price)),
          discount_per_spot: money(num(lead.discount_amount)),
          final_per_spot: money(num(lead.final_price)),
          total: sum("final_price"),
          paid: sum("amount_paid"),
          balance_due: money(perSpotBalance * size),
          balance_due_date: lead.balance_due_date,
          balance_status: lead.balance_status,
          balance_charged_at: lead.balance_charged_at,
        },
        codes: {
          discount_code: code?.code ?? null,
          creator_code: code?.is_creator ? code.code : null,
          squad_code: squadCode,
        },
        source: {
          heard_about_us: blank(lead.lead_source),
          staff_recommendation: blank(lead.staff_recommendation),
          friends_mentioned: blank(lead.friend_names_mentioned),
          utm_source: blank(lead.utm_source),
          utm_medium: blank(lead.utm_medium),
          utm_campaign: blank(lead.utm_campaign),
          utm_content: blank(lead.utm_content),
          advisor_ref: blank(lead.advisor_ref),
        },
      };
    });
    out.sort((a, b) => String(a.departure.date ?? "").localeCompare(String(b.departure.date ?? "")));
    return jr({ bookings: out, count: out.length });
  } catch (e) {
    console.error("loyalty-allin-bookings failed:", e instanceof Error ? e.message : e);
    return jr({ error: "Something went wrong" }, 500);
  }
});
