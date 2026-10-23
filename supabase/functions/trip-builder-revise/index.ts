// Trip builder: the guest changes the trip they already sent (Ewan, 23 Oct 2026).
// POST { ref, k, trip, summary, crewText, itinerary, note?, changes? }  (the same trip shape the builder sends in the first place)
//   k is the guest key from their trip page link (the one in their emails), so only they can do it.
// It REPLACES the trip on the same request: same reference, same deposit (if there was one), same beds held. The crew gets an UPDATED email with what moved,
// so nobody reviews a plan the guest has already moved on from. Rules per status are in _shared/trip-builder-revise.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { trustedBase } from "../_shared/app-base.ts";
import { sendEmail, TRIP_BUILDER_CONTACT, tripBuilderRevisedEmail } from "../_shared/email.ts";
import { fmtDay, notifyCrew, plainFirstName, plainText, usd } from "../_shared/trip-builder.ts";
import { guestTripUrl, verifyGuestKey } from "../_shared/trip-builder-crew.ts";
import { cleanRevision, guestCanEdit, MAX_REVISIONS, revisionPatch, type Update } from "../_shared/trip-builder-revise.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Not set up yet." }, 503);

  const raw = await req.text();
  if (raw.length > 200_000) return json({ error: "That trip is too big to send." }, 413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ref = typeof b.ref === "string" ? b.ref.trim().toUpperCase() : "";
  if (!/^MM-[A-Z0-9]{6}$/.test(ref)) return json({ error: "Unknown trip" }, 404);
  if (!(await verifyGuestKey(ref, b.k))) return json({ error: "This link has expired or isn't yours. Open your trip from the email we sent you." }, 401);

  const origin = req.headers.get("origin");
  const c = cleanRevision(b, new URL(trustedBase(origin)).origin);
  if (!c.ok) return json({ error: c.error }, 400);

  const sb = createClient(url, key);
  const { data: row, error } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (error) return json({ error: "Couldn't look that up." }, 500);
  if (!row) return json({ error: "Unknown trip" }, 404);
  if (!guestCanEdit(row.status)) {
    return json({ error: row.status === "declined" ? "That trip was closed, so it can't be changed. Start a new one from the builder." : "Your trip is booked, so the crew changes it from here. Message us and we'll sort it.", status: row.status, locked: true }, 409);
  }
  const prevRev = Number(((row.payload ?? {}) as Record<string, unknown>).rev) || 0;
  if (prevRev >= MAX_REVISIONS) return json({ error: "That's a lot of changes. Message the crew and we'll finish it with you.", locked: true }, 409);

  const now = new Date().toISOString();
  const r = revisionPatch(row, c, now);
  if (r.unchanged) return json({ ok: true, unchanged: true, rev: prevRev, status: row.status });
  const { error: uErr } = await sb.from("trip_builder_requests").update({ ...r.patch, updated_at: now }).eq("ref", ref);
  if (uErr) { console.error("trip builder revise save failed:", uErr.message); return json({ error: "Couldn't save your changes. Please try again." }, 500); }

  // The crew only knows about it once the trip is with them (not while it waits for a deposit); before that nobody has seen the first version, so there is nobody to tell.
  if (String(row.status) !== "pending_payment") {
    const update: Update = {
      rev: r.rev, changes: c.changes, note: c.note, wasStatus: String(row.status), withdrawn: r.withdrawn,
      was: { route: String(row.route ?? ""), days: Number(row.days ?? 0), total: row.est_total_usd != null ? usd(Number(row.est_total_usd)) : "", start: fmtDay(row.start_date) },
    };
    const fresh = { ...row, ...r.patch };
    await notifyCrew(fresh, (row.guest_email as string | null) || null, (row.hold_until as string | null) || null, origin, update)
      .catch((e) => console.warn("trip builder revise: crew email failed", e));
    const to = (row.guest_email as string | null) || (row.email as string | null);
    // A trip that was sent free and that nobody on the crew has picked up yet gets no confirmation email: the page has already told them, and an email would carry whatever
    // was typed into it to an address nobody has checked. Once the crew has it (or a deposit was paid) they get one, with only plain text in it.
    if (to && (Number(row.deposit_amount) > 0 || String(row.status) !== "submitted")) {
      const m = tripBuilderRevisedEmail({ firstName: plainFirstName(row.name), ref, route: plainText(c.f.route) || "your trip", days: c.f.days, changes: c.changes.map((x) => plainText(x, 140)).filter(Boolean), withdrawn: r.withdrawn, statusUrl: guestTripUrl(origin, ref, String(b.k)) });
      await sendEmail({ to, subject: m.subject, html: m.html, replyTo: TRIP_BUILDER_CONTACT, templateName: "trip_builder_revised" }).catch((e) => console.warn("trip builder revise: guest email failed", e));
    }
  }
  return json({ ok: true, rev: r.rev, status: r.nextStatus, withdrawn: r.withdrawn });
});
