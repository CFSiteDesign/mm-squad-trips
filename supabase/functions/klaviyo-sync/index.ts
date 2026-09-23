// Drains klaviyo_outbox into Klaviyo, gated by app_config('klaviyo_mode'):
//   off      nothing sent, outbox accumulates                     (default)
//   dry_run  payloads built and returned, nothing sent
//   test     only klaviyo_test_emails, always to klaviyo_list_test
//   live     everyone, to klaviyo_list_<trip slug> plus klaviyo_list_all ("ALL IN - Bookers")
//
// Runs from pg_cron every 15 minutes with {} (drain). Other actions, all
// behind the cron secret:
//   {"action":"status"}                         mode, lists, outbox counts
//   {"action":"lists"}                          the lists in the Klaviyo account
//   {"action":"create_test_list"}               make "ALL IN - Sync Test" and store its id
//   {"action":"dry_run"}                        what a drain would send
//   {"action":"test_profile","email":"…"}       synthetic booking -> test list (test mode only)
//   {"action":"test_journey","email":"…"}       one synthetic guest per trip, every event (test mode only)
//   {"action":"check","email":"…"}              read a profile, its lists and events back from Klaviyo
//   {"action":"backfill"}                       queue profile_sync for future bookings
//   {"action":"skip_stale","hours":24}          retire old pending rows before go-live
//
// Charlie, 23 Sep 2026: locked off until he flips the mode. Every failure
// goes in docs/klaviyo/BUILD_LOG.md.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  addToList,
  createList,
  enqueueKlaviyo,
  inspectProfile,
  listLists,
  METRIC_NAMES,
  trackEvent,
  upsertProfile,
  type KlaviyoProfile,
  type OutboxEvent,
} from "../_shared/klaviyo.ts";

type Mode = "off" | "dry_run" | "test" | "live";
const MODES: Mode[] = ["off", "dry_run", "test", "live"];
const MAX_ATTEMPTS = 5;
const BATCH = 100;
// Mirrors `nights` in src/data/trips.ts: the departure morning is not a night.
const NIGHTS: Record<string, number> = { vietnam: 13, thailand: 10 };

type Row = Record<string, unknown>;
type Cfg = { mode: Mode; testEmails: Set<string>; lists: Record<string, string> };
type Ctx = { lead: Row; trip: Row | null; dep: Row | null };

const normalizeCronSecret = (value: string | null) => {
  const trimmed = value?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};
const plusDays = (ymd: string, n: number) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
// me+anything@x.com is the same inbox as me@x.com, so a plus variant of an
// allowlisted address is allowlisted too. Lets one inbox hold a test guest per trip.
const baseAddress = (email: string) => email.replace(/\+[^@]*@/, "@");
const allowlisted = (cfg: Cfg, email: string) => cfg.testEmails.has(email) || cfg.testEmails.has(baseAddress(email));

type Step = "booking_placed" | "departure_confirmed" | "balance_paid" | "balance_failed" | "balance_failed_final" | "departure_cancelled";
// test_journey: one synthetic guest per trip, each down a different path, so
// every metric and every state a flow can branch on exists on the test list.
const JOURNEYS: Record<string, { story: string; mode: "independent" | "crew"; spots: number; steps: Step[] }> = {
  vietnam: { story: "crew of 2, departure confirmed, balance paid", mode: "crew", spots: 2, steps: ["booking_placed", "departure_confirmed", "balance_paid"] },
  "vietnam-7": { story: "independent, balance paid", mode: "independent", spots: 1, steps: ["booking_placed", "balance_paid"] },
  indonesia: { story: "crew, balance failed then paid", mode: "crew", spots: 1, steps: ["booking_placed", "departure_confirmed", "balance_failed", "balance_paid"] },
  "indonesia-7": { story: "crew, balance failed for good", mode: "crew", spots: 1, steps: ["booking_placed", "departure_confirmed", "balance_failed", "balance_failed_final"] },
  cambodia: { story: "crew, departure cancelled and refunded", mode: "crew", spots: 1, steps: ["booking_placed", "departure_cancelled"] },
  thailand: { story: "independent, just booked (deposit paid)", mode: "independent", spots: 1, steps: ["booking_placed"] },
};

async function loadConfig(sb: SupabaseClient): Promise<Cfg> {
  const { data } = await sb.from("app_config").select("key,value").like("key", "klaviyo_%");
  const cfg: Record<string, string> = {};
  for (const r of data ?? []) cfg[str(r.key)] = str(r.value).trim();
  const mode = (MODES as string[]).includes(cfg.klaviyo_mode) ? (cfg.klaviyo_mode as Mode) : "off";
  const testEmails = new Set(
    (cfg.klaviyo_test_emails ?? "").split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  const lists: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) if (k.startsWith("klaviyo_list_") && v) lists[k.slice("klaviyo_list_".length)] = v;
  return { mode, testEmails, lists };
}

async function loadBooking(sb: SupabaseClient, session: string): Promise<Ctx | null> {
  const { data: lead } = await sb.from("bookings").select("*").eq("stripe_session_id", session).order("spot_number").limit(1).maybeSingle();
  if (!lead) return null;
  const [{ data: trip }, { data: dep }] = await Promise.all([
    lead.trip_id ? sb.from("trips").select("slug,name,code,days").eq("id", lead.trip_id).maybeSingle() : Promise.resolve({ data: null }),
    lead.departure_id ? sb.from("departures").select("departure_date,status").eq("id", lead.departure_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { lead: lead as Row, trip: (trip as Row) ?? null, dep: (dep as Row) ?? null };
}

/** The `allin_*` properties Mich builds on. Renaming breaks her flows. */
function buildProfile(ctx: Ctx, opts: { test: boolean }): { profile: KlaviyoProfile; eventProps: Record<string, unknown>; slug: string } {
  const { lead, trip, dep } = ctx;
  const email = str(lead.lead_email).trim().toLowerCase();
  const [firstName = "", ...rest] = str(lead.lead_name).trim().split(/\s+/);
  const slug = str(trip?.slug);
  const days = Number(trip?.days ?? 0) || null;
  const nights = days ? (NIGHTS[slug] ?? days) : null;
  const departureDate = str(dep?.departure_date) || null;
  const travellerMode = str(lead.traveller_mode) || (lead.lead_solo ? "independent" : "crew");
  // DB trip names are all over the place ("Vietnam", "7 Day Gili T + Lombok"),
  // so the name guests read is built the way Mich named her lists: "Vietnam 14 Days".
  const country = slug ? slug.split("-")[0].replace(/^./, (c) => c.toUpperCase()) : "";
  const properties: Record<string, unknown> = {
    allin_trip: slug,
    allin_trip_name: country && days ? `${country} ${days} Days` : str(trip?.name),
    allin_country: country || null,
    allin_trip_code: str(trip?.code),
    allin_departure_date: departureDate,
    allin_end_date: departureDate && nights !== null ? plusDays(departureDate, nights) : null,
    allin_days: days,
    allin_nights: nights,
    allin_departure_status: str(dep?.status) || null,
    allin_booking_ref: str(lead.booking_ref) || null,
    allin_booking_type: "lead",
    allin_booking_status: str(lead.status) || null,
    allin_traveller_mode: travellerMode,
    allin_group_size: Number(lead.group_size ?? 1) || 1,
    allin_balance_status: str(lead.balance_status) || null,
    allin_balance_due_date: str(lead.balance_due_date) || null,
    allin_last_synced_at: new Date().toISOString(),
    allin_test: opts.test,
  };
  if (str(lead.advisor_ref)) properties.allin_advisor_ref = str(lead.advisor_ref);
  const eventProps = {
    trip: slug,
    trip_name: properties.allin_trip_name,
    departure_date: departureDate,
    booking_ref: properties.allin_booking_ref,
    spots: properties.allin_group_size,
    traveller_mode: travellerMode,
    test: opts.test,
  };
  return { profile: { email, phone: str(lead.lead_phone).replace(/[\s()-]/g, ""), firstName, lastName: rest.join(" "), properties }, eventProps, slug };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** booking_placed value = full trip due (order). Other events = cash moved this step. Always USD. */
function eventMoney(event: OutboxEvent, payload: Record<string, unknown>, lead: Row): {
  value?: number;
  currency: string;
  props: Record<string, unknown>;
} {
  const spots = Number(lead.group_size ?? payload.spots ?? 1) || 1;
  const fromRow = (perSpot: unknown) => {
    const n = Number(perSpot);
    return Number.isFinite(n) ? Math.round(n * spots * 100) / 100 : null;
  };
  const amountPaid = num(payload.amount_paid) ?? num(payload.amount) ?? fromRow(lead.amount_paid);
  const fullDue = num(payload.full_due) ?? fromRow(lead.final_price);
  const balanceDue = num(payload.balance_due) ??
    (fullDue != null && amountPaid != null ? Math.max(0, Math.round((fullDue - amountPaid) * 100) / 100) : fromRow(lead.balance_amount));
  const currency = (str(payload.currency) || "USD").toUpperCase();
  const props: Record<string, unknown> = { currency };
  if (amountPaid != null) props.amount_paid = amountPaid;
  if (fullDue != null) props.full_due = fullDue;
  if (balanceDue != null) props.balance_due = balanceDue;
  const cash = num(payload.amount) ?? amountPaid ?? undefined;
  const value = event === "booking_placed" ? (fullDue ?? cash) : cash;
  return { value: value ?? undefined, currency, props };
}

type Outcome = { id: string; session: string; event: string; result: string; detail?: unknown };

async function processRow(sb: SupabaseClient, row: Row, cfg: Cfg, dry: boolean): Promise<Outcome> {
  const id = str(row.id);
  const session = str(row.booking_session);
  const event = str(row.event) as OutboxEvent;
  const base = { id, session, event };
  const fail = async (error: string, permanent: boolean) => {
    const attempts = Number(row.attempts ?? 0) + 1;
    await sb.from("klaviyo_outbox").update({ attempts, last_error: error.slice(0, 500), status: permanent || attempts >= MAX_ATTEMPTS ? "failed" : "pending" }).eq("id", id);
    await sb.from("bookings").update({ klaviyo_last_error: error.slice(0, 500) }).eq("stripe_session_id", session);
    return { ...base, result: permanent || attempts >= MAX_ATTEMPTS ? "failed" : "retry", detail: error };
  };

  const ctx = await loadBooking(sb, session);
  if (!ctx) return dry ? { ...base, result: "would fail", detail: "booking not found" } : fail("booking not found", true);
  const { profile, eventProps, slug } = buildProfile(ctx, { test: cfg.mode === "test" });
  if (!profile.email) {
    if (dry) return { ...base, result: "would skip", detail: "no lead email" };
    await sb.from("klaviyo_outbox").update({ status: "skipped", last_error: "no lead email" }).eq("id", id);
    return { ...base, result: "skipped", detail: "no lead email" };
  }
  if (cfg.mode === "test" && !allowlisted(cfg, profile.email)) return { ...base, result: "held", detail: `${profile.email} not in test allowlist` };

  // Live: the trip list plus the master "ALL IN - Bookers" list. Test: only the test list.
  const listIds = cfg.mode === "test" ? [cfg.lists.test] : [cfg.lists[slug], cfg.lists.all];
  const lists = [...new Set(listIds.filter((l): l is string => Boolean(l)))];
  const listId = lists[0];
  const metric = event === "profile_sync" ? null : METRIC_NAMES[event];
  const payload = (row.payload as Record<string, unknown>) ?? {};
  const money = eventMoney(event, payload, ctx.lead);
  const plan = {
    email: profile.email,
    lists,
    metric,
    properties: profile.properties,
    eventProps: { ...eventProps, ...payload, ...money.props },
    time: str(row.created_at) || undefined,
  };
  if (dry) return { ...base, result: "would send", detail: plan };

  try {
    const profileId = await upsertProfile(profile);
    for (const l of lists) await addToList(l, profileId);
    if (metric) {
      await trackEvent({
        metric,
        email: profile.email,
        properties: plan.eventProps,
        value: money.value,
        valueCurrency: money.currency,
        uniqueId: `${event}:${id}`,
        time: plan.time,
      });
    }
    await sb.from("klaviyo_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", id);
    await sb.from("bookings").update({ klaviyo_synced_at: new Date().toISOString(), klaviyo_last_error: null }).eq("stripe_session_id", session);
    return { ...base, result: "sent", detail: { email: profile.email, lists, metric } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), false);
  }
}

async function pendingRows(sb: SupabaseClient, limit = BATCH): Promise<Row[]> {
  const { data, error } = await sb.from("klaviyo_outbox").select("*").eq("status", "pending").lt("attempts", MAX_ATTEMPTS).order("created_at").limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return json({ error: "not configured" }, 503);
  const sb = createClient(sbUrl, sbKey);

  const provided = normalizeCronSecret(req.headers.get("x-cron-secret"));
  const { data: vaultSecret, error: vaultErr } = await sb.rpc("get_cron_secret");
  if (vaultErr) return json({ error: "cron secret unavailable" }, 503);
  const secret = normalizeCronSecret(typeof vaultSecret === "string" ? vaultSecret : null);
  if (!secret || provided !== secret) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // cron sends {} or nothing
  }
  const action = str(body.action) || "drain";
  const cfg = await loadConfig(sb);
  const keyPresent = Boolean(Deno.env.get("KLAVIYO_PRIVATE_KEY"));

  try {
    if (action === "status") {
      const counts: Record<string, number> = {};
      for (const s of ["pending", "sent", "skipped", "failed"]) {
        const { count } = await sb.from("klaviyo_outbox").select("id", { count: "exact", head: true }).eq("status", s);
        counts[s] = count ?? 0;
      }
      const { count: unsynced } = await sb.from("bookings").select("id", { count: "exact", head: true }).eq("spot_number", 1).eq("status", "Confirmed").is("klaviyo_synced_at", null);
      return json({ ok: true, mode: cfg.mode, keyPresent, testEmails: [...cfg.testEmails], lists: cfg.lists, outbox: counts, unsyncedLeadBookings: unsynced ?? 0 });
    }

    if (action === "lists") {
      if (!keyPresent) return json({ error: "KLAVIYO_PRIVATE_KEY is not set" }, 503);
      return json({ ok: true, lists: await listLists() });
    }

    if (action === "create_test_list") {
      // Our own empty list, so no pre-existing flow can ever fire on a test.
      if (cfg.lists.test) return json({ ok: true, existing: true, listId: cfg.lists.test });
      const name = str(body.name) || "ALL IN - Sync Test";
      const existing = (await listLists()).find((l) => l.name === name);
      const listId = existing?.id ?? (await createList(name));
      const { error } = await sb.from("app_config").upsert({ key: "klaviyo_list_test", value: listId, updated_at: new Date().toISOString() });
      if (error) return json({ error: `list ${listId} created but app_config write failed: ${error.message}` }, 500);
      return json({ ok: true, created: !existing, listId, name });
    }

    if (action === "test_profile") {
      const email = str(body.email).trim().toLowerCase();
      if (cfg.mode !== "test") return json({ error: `test_profile needs klaviyo_mode = test (it is ${cfg.mode})` }, 400);
      if (!email || !allowlisted(cfg, email)) return json({ error: "email must be in klaviyo_test_emails" }, 400);
      const slug = str(body.trip) || "vietnam-7";
      const { data: trip } = await sb.from("trips").select("slug,name,code,days,default_price").eq("slug", slug).maybeSingle();
      if (!trip) return json({ error: `unknown trip ${slug}` }, 400);
      const departureDate = str(body.date) || plusDays(new Date().toISOString().slice(0, 10), 14);
      const ctx: Ctx = {
        lead: { lead_email: email, lead_name: str(body.name) || "ALL IN Test", lead_phone: "", group_size: 1, booking_ref: `TEST-${Date.now().toString(36).toUpperCase()}`, status: "Confirmed", traveller_mode: "independent", balance_status: "scheduled", balance_due_date: plusDays(departureDate, -7) },
        trip: trip as Row,
        dep: { departure_date: departureDate, status: "confirmed" },
      };
      const { profile, eventProps } = buildProfile(ctx, { test: true });
      if (body.dry_run === true) return json({ ok: true, dry: true, profile, eventProps, listId: cfg.lists.test ?? null });
      const profileId = await upsertProfile(profile);
      if (cfg.lists.test) await addToList(cfg.lists.test, profileId);
      const deposit = 99;
      const fullDue = Number((trip as { default_price?: number }).default_price) || deposit;
      await trackEvent({
        metric: METRIC_NAMES.booking_placed,
        email,
        properties: { ...eventProps, amount: deposit, amount_paid: deposit, full_due: fullDue, balance_due: Math.max(0, fullDue - deposit), currency: "USD" },
        value: fullDue,
        valueCurrency: "USD",
        uniqueId: `test:${profile.properties.allin_booking_ref}`,
      });
      return json({ ok: true, sent: true, profileId, listId: cfg.lists.test ?? null, profile: profile.properties });
    }

    if (action === "test_journey") {
      // Fake guests only: no bookings rows, no Stripe, no outbox, test list only.
      // Event payloads match what the lifecycle functions put in the outbox.
      const email = str(body.email).trim().toLowerCase();
      if (cfg.mode !== "test") return json({ error: `test_journey needs klaviyo_mode = test (it is ${cfg.mode})` }, 400);
      if (!email || !cfg.testEmails.has(email)) return json({ error: "email must be in klaviyo_test_emails" }, 400);
      if (!cfg.lists.test) return json({ error: "no klaviyo_list_test; run create_test_list first" }, 400);
      const wanted = Array.isArray(body.trips) ? (body.trips as unknown[]).map(str) : Object.keys(JOURNEYS);
      const dry = body.dry_run === true;
      const today = new Date().toISOString().slice(0, 10);
      const run = Date.now().toString(36).toUpperCase();
      const [local, domain] = email.split("@");
      const out: unknown[] = [];

      for (const slug of wanted) {
        const j = JOURNEYS[slug];
        if (!j) { out.push({ trip: slug, error: "no journey for this trip" }); continue; }
        const { data: trip } = await sb.from("trips").select("id,slug,name,code,days,default_price").eq("slug", slug).maybeSingle();
        if (!trip) { out.push({ trip: slug, error: "trip not in database" }); continue; }
        // A real upcoming departure date for the trip, so dates look like the real thing.
        const { data: nextDep } = await sb.from("departures").select("departure_date").eq("trip_id", trip.id).neq("status", "cancelled").gte("departure_date", plusDays(today, 10)).order("departure_date").limit(1).maybeSingle();
        const departureDate = str(body.date) || str(nextDep?.departure_date) || plusDays(today, 14);
        const guestEmail = `${local.split("+")[0]}+allin-${slug}@${domain}`;
        const price = Number(trip.default_price ?? 0);
        const deposit = 99 * j.spots;
        const balance = Math.max(0, price * j.spots - deposit);
        const ref = `TEST-${str(trip.code)}-${run}`;
        const lead: Row = {
          lead_email: guestEmail, lead_name: `Test ${str(trip.name).replace(/^ALL IN\s*[·\-–]\s*/i, "")}`, lead_phone: "",
          group_size: j.spots, booking_ref: ref, status: "Confirmed", traveller_mode: j.mode, lead_solo: j.mode === "independent",
          balance_status: "scheduled", balance_due_date: plusDays(departureDate, -7),
        };
        const dep: Row = { departure_date: departureDate, status: "pending" };
        const sent: unknown[] = [];
        let profileId = "";
        for (const [i, step] of j.steps.entries()) {
          let event: Exclude<OutboxEvent, "profile_sync"> = step === "balance_failed_final" ? "balance_failed" : step;
          let payload: Record<string, unknown> = {};
          if (step === "booking_placed") payload = { amount: deposit, amount_paid: deposit, full_due: price * j.spots, balance_due: balance, spots: j.spots, payment_type: "Deposit", currency: "USD" };
          if (step === "departure_confirmed") { dep.status = "confirmed"; payload = { departure_date: departureDate }; }
          if (step === "balance_paid") { lead.balance_status = "charged"; payload = { amount: balance, via: "auto" }; }
          if (step === "balance_failed") { lead.balance_status = "failed"; payload = { amount: balance, attempts: 1, final: false }; }
          if (step === "balance_failed_final") { lead.balance_status = "failed_final"; payload = { amount: balance, final: true }; }
          if (step === "departure_cancelled") {
            event = "departure_cancelled";
            lead.status = "Cancelled"; lead.balance_status = "cancelled"; dep.status = "cancelled";
            payload = { departure_date: departureDate, refunded: deposit };
          }
          const { profile, eventProps } = buildProfile({ lead, trip: trip as Row, dep }, { test: true });
          const metric = METRIC_NAMES[event];
          const props = { ...eventProps, ...payload };
          if (dry) { sent.push({ metric, props, profile: profile.properties }); continue; }
          profileId = await upsertProfile(profile);
          if (i === 0) await addToList(cfg.lists.test, profileId);
          const value = step === "booking_placed" ? price * j.spots : (typeof payload.amount === "number" ? payload.amount : undefined);
          await trackEvent({ metric, email: guestEmail, properties: props, value, valueCurrency: "USD", uniqueId: `test:${ref}:${i}:${step}` });
          sent.push(metric);
        }
        out.push({ trip: slug, email: guestEmail, story: j.story, departureDate, bookingRef: ref, profileId: profileId || null, events: sent });
      }
      return json({ ok: true, dry, list: cfg.lists.test, guests: out });
    }

    if (action === "check") {
      const email = str(body.email).trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);
      if (!keyPresent) return json({ error: "KLAVIYO_PRIVATE_KEY is not set" }, 503);
      // Read-only; limited to test addresses so this is never a lookup tool for guests.
      if (!allowlisted(cfg, email)) return json({ error: "check is limited to klaviyo_test_emails and their plus variants" }, 400);
      const found = await inspectProfile(email);
      return json({ ok: true, email, found: Boolean(found), profile: found });
    }

    if (action === "backfill") {
      const { data: leads } = await sb
        .from("bookings")
        .select("stripe_session_id,departures!inner(departure_date)")
        .eq("spot_number", 1)
        .eq("status", "Confirmed")
        .is("klaviyo_synced_at", null)
        .gte("departures.departure_date", new Date().toISOString().slice(0, 10));
      let queued = 0;
      for (const l of leads ?? []) {
        await enqueueKlaviyo(sb, str(l.stripe_session_id), "profile_sync", { source: "backfill" });
        queued++;
      }
      return json({ ok: true, mode: cfg.mode, queued, note: "rows are drained by the next run according to klaviyo_mode" });
    }

    if (action === "skip_stale") {
      const hours = Number(body.hours ?? 24) || 24;
      const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
      const { data } = await sb.from("klaviyo_outbox").update({ status: "skipped", last_error: `stale before go-live (${hours}h)` }).eq("status", "pending").lt("created_at", cutoff).select("id");
      return json({ ok: true, skipped: data?.length ?? 0, cutoff });
    }

    // drain / dry_run
    const dry = action === "dry_run" || cfg.mode === "dry_run";
    if (cfg.mode === "off" && action !== "dry_run") return json({ ok: true, mode: "off", processed: 0, note: "klaviyo_mode is off; nothing sent" });
    if (!dry && !keyPresent) return json({ error: "KLAVIYO_PRIVATE_KEY is not set" }, 503);
    const rows = await pendingRows(sb, dry ? 50 : BATCH);
    const results: Outcome[] = [];
    for (const row of rows) results.push(await processRow(sb, row, cfg, dry));
    const summary: Record<string, number> = {};
    for (const r of results) summary[r.result] = (summary[r.result] ?? 0) + 1;
    return json({ ok: true, mode: cfg.mode, dry, processed: results.length, summary, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
