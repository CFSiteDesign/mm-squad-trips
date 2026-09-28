// Admin-only: queue a fake ALL IN booker onto the MMK Check-in reminder
// job table. Does not create a booking or charge Stripe.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { adminAuthHeaderToken, verifyAdminToken } from "../_shared/admin-auth.ts";
import { allInReminderProperties, backfillAllInBookingsToMmk, enqueueAllInToMmk, listAllInMmkJobs } from "../_shared/mmk-reminders.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function plusDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await verifyAdminToken(adminAuthHeaderToken(req)))) {
    return jr({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  if (body.op === "jobs") {
    const listed = await listAllInMmkJobs(80);
    if (listed.skipped) return jr({ error: listed.skipped, ...listed }, 503);
    if (!listed.ok) return jr({ error: listed.message || "Could not list MMK jobs", ...listed }, 502);
    return jr({ ok: true, jobs: listed.jobs ?? [] });
  }

  if (body.op === "backfill") {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Supabase not configured" }, 503);
    const scopes = (Array.isArray(body.scopes) ? body.scopes : ["upcoming"])
      .map((s) => String(s))
      .filter((s): s is "previous" | "ongoing" | "upcoming" =>
        s === "previous" || s === "ongoing" || s === "upcoming");
    const sb = createClient(url, key);
    const [{ data: modeRow }, { data: emailsRow }] = await Promise.all([
      sb.from("app_config").select("value").eq("key", "klaviyo_mode").maybeSingle(),
      sb.from("app_config").select("value").eq("key", "klaviyo_test_emails").maybeSingle(),
    ]);
    const mode = String(modeRow?.value ?? "").trim();
    const testEmails = new Set(
      String(emailsRow?.value ?? "")
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const result = await backfillAllInBookingsToMmk(sb, {
      ruleId: Number(body.ruleId) > 0 ? Number(body.ruleId) : undefined,
      scopes: scopes.length ? scopes : ["upcoming"],
      previousDays: Number(body.previousDays ?? 90) || 90,
      testEmails: mode === "test" ? testEmails : undefined,
    });
    return jr({ ok: true, ...result });
  }

  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "ALL IN Test").trim() || "ALL IN Test";
  const tripSlug = String(body.tripSlug ?? "vietnam-7").trim() || "vietnam-7";
  const tripName = String(body.tripName ?? "Vietnam 7 Days").trim() || "Vietnam 7 Days";
  const departureDate = String(body.departureDate ?? "").trim() || plusDays(new Date().toISOString().slice(0, 10), 14);
  const bookingRef = `TEST-${Date.now().toString(36).toUpperCase()}`;

  if (!email || !email.includes("@")) return jr({ error: "email required" }, 400);

  const firstName = name.split(" ")[0] || "ALL";
  const lastName = name.split(" ").slice(1).join(" ");
  const queued = await enqueueAllInToMmk({
    bookingRef,
    email,
    firstName,
    lastName: lastName || undefined,
    departureDate,
    tripSlug,
    properties: allInReminderProperties({
      bookingRef,
      email,
      firstName,
      lastName: lastName || null,
      tripSlug,
      tripName,
      departureDate,
      bookedAt: new Date().toISOString(),
      amountPaid: 99,
      fullDue: 310,
      spots: 1,
      test: true,
    }),
  });

  if (queued.skipped) return jr({ error: queued.skipped, ...queued }, 503);
  if (!queued.ok) return jr({ error: queued.message || "MMK queue failed", ...queued }, 502);

  const listed = await listAllInMmkJobs(80);
  return jr({
    ok: true,
    email,
    bookingRef,
    departureDate,
    queued: queued.queued ?? [],
    rules: queued.rules ?? [],
    jobs: listed.jobs ?? [],
  });
});
