// "Log in" for guests who have sent a trip (Ewan, 23 Oct 2026): POST { email } emails them a link to each trip they've sent, so they can change it or
// plan the next stage from any device. No passwords: the link carries the same signed guest key as the "your trip" emails (_shared/trip-builder-crew.ts).
//
// The answer is always { ok: true } whether or not that address has a trip, and a throttled address gets the same answer, so this can't be used to find
// out who has booked. Only trips that are still live (with the crew, being checked, ready or booked: not declined, not waiting on an unpaid deposit) are included.
// A few emails an hour per address. What is printed about a trip is only plain text (anyone can send a trip with anyone's email, so a route is whatever they typed).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail, tripBuilderLoginEmail } from "../_shared/email.ts";
import { plainFirstName, plainText } from "../_shared/trip-builder.ts";
import { guestTripUrl, signGuestKey } from "../_shared/trip-builder-crew.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIVE = ["submitted", "checking", "ready", "approved"];
const MAX_PER_HOUR = 3;
const COLS = "ref,name,status,route,days,created_at,email,guest_email";
/** An email address as a LIKE pattern that can only match itself ("_" and "%" are wildcards, and "_" is common in an address like a_b@x.com). */
const exactLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Not set up yet." }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (typeof b.website === "string" && b.website.trim()) return json({ ok: true });            // a bot filled the hidden field
  const email = (typeof b.email === "string" ? b.email : "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL.test(email)) return json({ error: "That email doesn't look right." }, 400);
  if (email.includes("*")) return json({ ok: true });                                         // "*" is a wildcard in a PostgREST pattern and can't be escaped: no real address needs it

  const sb = createClient(url, key);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await sb.from("email_send_log").select("id").eq("template_name", "trip_builder_login").eq("recipient_email", email).gte("created_at", since).limit(10);
  if ((recent.data?.length ?? 0) >= MAX_PER_HOUR) return json({ ok: true });                  // quietly: "too many" would say this address has trips

  const [byContact, byReceipt] = await Promise.all([
    sb.from("trip_builder_requests").select(COLS).eq("email", email).in("status", LIVE),
    sb.from("trip_builder_requests").select(COLS).ilike("guest_email", exactLike(email)).in("status", LIVE),
  ]);
  const seen = new Set<string>();
  const rows = [...(byContact.data ?? []), ...(byReceipt.data ?? [])]
    .filter((r) => String(r.email ?? "").toLowerCase() === email || String(r.guest_email ?? "").toLowerCase() === email)
    .filter((r) => (seen.has(r.ref) ? false : (seen.add(r.ref), true)))
    .sort((x, y) => String(y.created_at ?? "").localeCompare(String(x.created_at ?? "")))
    .slice(0, 5);
  if (!rows.length) return json({ ok: true });

  const origin = req.headers.get("origin");
  const trips = await Promise.all(rows.map(async (r) => ({
    ref: String(r.ref), route: plainText(r.route) || "your trip", days: Number(r.days) || 0, status: String(r.status), url: guestTripUrl(origin, r.ref, await signGuestKey(r.ref)),
  })));
  const first = plainFirstName(rows[0].name);
  const m = tripBuilderLoginEmail({ firstName: first, trips });
  await sendEmail({ to: email, subject: m.subject, html: m.html, templateName: "trip_builder_login", metadata: { trips: trips.length } });
  return json({ ok: true });
});
