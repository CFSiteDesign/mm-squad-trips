// Trip builder payments (Charlie, 19 Oct 2026). Ewan's trip builder is served
// from public/trip-builder; sending a trip for checking takes a deposit per
// person (trip-builder-request), the crew sends the balance from the admin
// (trip-builder-admin), and stripe-webhook hands both payments to
// handleTripBuilderPaid below. Table: trip_builder_requests.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@18.5.0";
import { appBase } from "./app-base.ts";
import {
  APP_URL,
  sendEmail,
  tripBuilderConfirmedEmail,
  tripBuilderDepositEmail,
  tripBuilderOpsEmail,
  TRIP_BUILDER_CONTACT,
} from "./email.ts";
import { crewReviewUrl, readSummary, signCrewKey, suggestBalance } from "./trip-builder-crew.ts";

// Trip builder enquiries are Ewan's (Charlie, 19 Oct 2026): every alert goes to
// him and every guest email replies to him, not the ALL IN ops list or cs@.
const EWAN = TRIP_BUILDER_CONTACT;

/** Anyone else who should get the new-trip email, e.g. TRIP_BUILDER_TEAM_EMAILS="sam@madmonkeyhostels.com, jo@madmonkeyhostels.com". Optional. */
export function teamCc(): string[] | undefined {
  const list = (Deno.env.get("TRIP_BUILDER_TEAM_EMAILS") ?? "").split(",").map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) && x.toLowerCase() !== EWAN.toLowerCase());
  return list.length ? list : undefined;
}

export const DEPOSIT_PER_PERSON_USD = 50;
export const HOLD_HOURS = 48;
export const MAX_PEOPLE = 8;

export const usd = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** The builder's own address for a request's status page, on whichever site the guest used. */
export function builderStatusUrl(origin: string | null, ref: string): string {
  return `${appBase(origin)}/trip-builder/#/trip/${encodeURIComponent(ref)}`;
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtDayTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

type Row = Record<string, unknown> & {
  ref: string; name: string; status: string; route: string | null; days: number | null; start_date: string | null;
  party_size: number; deposit_amount: number; balance_amount: number | null; email: string | null; whatsapp: string | null;
  contact_via: string | null; guest_email: string | null; deposit_paid_at: string | null; balance_paid_at: string | null;
};

/** checkout.session.completed with metadata.kind trip_builder_deposit / trip_builder_balance. Idempotent. */
export async function handleTripBuilderPaid(sb: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  const meta = (session.metadata ?? {}) as Record<string, string>;
  const ref = meta.ref ?? "";
  const { data, error } = await sb.from("trip_builder_requests").select("*").eq("ref", ref).maybeSingle();
  if (error || !data) {
    console.warn(`trip builder payment for unknown ref ${ref}:`, error?.message ?? "not found");
    return;
  }
  const row = data as Row;
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const guestEmail = session.customer_details?.email || session.customer_email || row.guest_email || row.email || null;
  const first = String(row.name ?? "").trim().split(/\s+/)[0] || "there";
  const statusUrl = builderStatusUrl(meta.origin || null, row.ref);
  const now = new Date();

  if (meta.kind === "trip_builder_deposit") {
    if (row.deposit_paid_at) return;
    const holdUntil = row.start_date ? new Date(now.getTime() + HOLD_HOURS * 3600_000).toISOString() : null;
    const { error: uErr } = await sb.from("trip_builder_requests").update({
      status: "submitted",
      deposit_paid_at: now.toISOString(),
      deposit_payment_intent: pi,
      guest_email: guestEmail,
      hold_until: holdUntil,
      updated_at: now.toISOString(),
    }).eq("ref", row.ref);
    if (uErr) throw new Error(`trip builder deposit save: ${uErr.message}`);

    const deposit = usd(Number(row.deposit_amount));
    if (guestEmail) {
      const m = tripBuilderDepositEmail({
        firstName: first, ref: row.ref, route: row.route ?? "Your trip", days: Number(row.days ?? 0),
        startDate: fmtDay(row.start_date), deposit, people: Number(row.party_size ?? 1),
        holdUntil: fmtDayTime(holdUntil), statusUrl,
      });
      await sendEmail({ to: guestEmail, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_deposit" }).catch((e) => console.warn("trip builder guest email failed", e));
    }
    const contact = row.contact_via === "whatsapp" ? `WhatsApp ${row.whatsapp ?? ""}` : `Email ${row.email ?? ""}`;
    // The whole trip as the guest built it (payload.summary), and three one-tap links into the crew review page. Older trips have no summary: the email falls back to the plain itinerary.
    const summary = readSummary(row.payload);
    const key = await signCrewKey(row.ref);
    const origin = meta.origin || null;
    const ops = tripBuilderOpsEmail({
      ref: row.ref, name: String(row.name), contact, guestEmail: guestEmail ?? "", guestWhatsapp: row.contact_via === "whatsapp" ? String(row.whatsapp ?? "") : "",
      people: Number(row.party_size ?? 1),
      route: row.route ?? "", days: Number(row.days ?? 0), startDate: fmtDay(row.start_date), dates: String(row.dates_flex ?? ""),
      estTotal: row.est_total_usd != null ? `${usd(Number(row.est_total_usd))} (builder estimate)` : "",
      deposit, allInMatch: String(row.all_in_match ?? ""), notes: String(row.notes ?? ""), itinerary: String(row.itinerary ?? ""),
      tripLink: String(row.trip_link ?? ""), adminUrl: `${APP_URL}/admin`, holdUntil: fmtDayTime(holdUntil),
      summary,
      reviewUrl: crewReviewUrl(origin, row.ref, key), approveUrl: crewReviewUrl(origin, row.ref, key, "approve"),
      declineUrl: crewReviewUrl(origin, row.ref, key, "decline"), editUrl: crewReviewUrl(origin, row.ref, key, "edit"),
      suggestedBalance: summary ? usd(suggestBalance(summary, Number(row.deposit_amount))) : "",
    });
    await sendEmail({ to: EWAN, cc: teamCc(), subject: ops.subject, html: ops.html, replyTo: guestEmail ?? undefined, templateName: "trip_builder_ops" }).catch((e) => console.warn("trip builder ops email failed", e));
    return;
  }

  if (meta.kind === "trip_builder_balance") {
    if (row.balance_paid_at) return;
    const { error: uErr } = await sb.from("trip_builder_requests").update({
      status: "approved",
      balance_paid_at: now.toISOString(),
      balance_payment_intent: pi,
      guest_email: row.guest_email || guestEmail,
      updated_at: now.toISOString(),
    }).eq("ref", row.ref);
    if (uErr) throw new Error(`trip builder balance save: ${uErr.message}`);
    const paid = usd((session.amount_total ?? 0) / 100);
    if (guestEmail) {
      const m = tripBuilderConfirmedEmail({ firstName: first, ref: row.ref, route: row.route ?? "your trip", paid, statusUrl });
      await sendEmail({ to: guestEmail, subject: m.subject, html: m.html, replyTo: EWAN, templateName: "trip_builder_confirmed" }).catch((e) => console.warn("trip builder confirmed email failed", e));
    }
    await sendEmail({
      to: EWAN,
      subject: `Trip builder: ${row.name} paid the ${paid} balance · ${row.ref}`,
      html: `<p><strong>${String(row.name).replace(/</g, "&lt;")}</strong> paid the ${paid} balance for ${String(row.route ?? "").replace(/</g, "&lt;")} (${row.ref}). It's booked: make sure the beds are locked in.</p>`,
      templateName: "trip_builder_balance_ops",
    }).catch((e) => console.warn("trip builder balance ops email failed", e));
  }
}
