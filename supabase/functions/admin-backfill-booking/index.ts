// Admin backfill: recreate booking rows + send emails for Stripe checkout
// sessions that never reached the stripe-webhook (e.g. webhook endpoint was
// misconfigured). Idempotent: skips sessions that already have booking rows.
//
// Auth: requires header `x-admin-password: <ADMIN_PASSWORD>`.
// Body: { session_ids?: string[], payment_intent_ids?: string[], send_emails?: boolean }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  APP_URL,
  bookingConfirmationEmail,
  bookingOpsNotificationEmail,
  OPS_NOTIFY_EMAILS,
  opsCcForTrip,
  sendEmail,
  soloBookingConfirmedEmail,
} from "../_shared/email.ts";

function envClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

function parseTraveler(v: string) {
  const [name = "", email = "", age = "", dietary = ""] = v.split("|");
  return { name, email, age, dietary };
}

async function nextSequencedRef(
  sb: ReturnType<typeof envClient>,
  column: "group_id" | "booking_ref",
  prefix: string,
): Promise<string> {
  const { data } = await sb.from("bookings").select(column).like(column, `${prefix}%`);
  let max = 0;
  for (const r of data ?? []) {
    const v = (r as Record<string, unknown>)[column] as string | null;
    if (!v) continue;
    const n = parseInt(v.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function processSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  sendEmails: boolean,
): Promise<{ session_id: string; status: string; detail?: string }> {
  const sb = envClient();
  const sessionId = session.id;
  const m = (session.metadata ?? {}) as Record<string, string>;

  const { data: existing } = await sb
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .limit(1);
  if ((existing ?? []).length > 0) {
    return { session_id: sessionId, status: "skipped_exists" };
  }

  let tripId: string | null = m.trip_id || null;
  if (!tripId && m.trip_slug) {
    const { data: t } = await sb.from("trips").select("id").eq("slug", m.trip_slug).maybeSingle();
    tripId = t?.id ?? null;
  }
  const departureId: string | null = m.departure_id || null;

  let discountId: string | null = m.discount_code_id || null;
  if (!discountId && m.discount_code) {
    const { data: d } = await sb
      .from("discount_codes")
      .select("id")
      .eq("code", String(m.discount_code).toUpperCase())
      .maybeSingle();
    discountId = d?.id ?? null;
  }

  const groupSize = Math.max(1, Number(m.group_size || "1"));
  const paymentType = m.payment_type === "deposit" ? "Deposit" : "Full";
  const amountPaidTotal = (session.amount_total ?? 0) / 100;
  const subtotal = Number(m.subtotal || "0");
  const discountAmount = Number(m.discount_amount || "0");
  const fullDue = Number(m.full_due || String(subtotal - discountAmount));
  const pricePerSpot = Number(m.price_per_spot || "0");
  const perSpotPaid = amountPaidTotal / groupSize;
  const perSpotFinal = fullDue / groupSize;
  const perSpotDiscount = discountAmount / groupSize;

  const isSolo = groupSize === 1;
  const tripCode = (m.trip_code || "XXX").toUpperCase();
  const groupId = isSolo ? null : await nextSequencedRef(sb, "group_id", `GRP-${tripCode}-`);
  const bookingRef = isSolo
    ? await nextSequencedRef(sb, "booking_ref", `SOL-${tripCode}-`)
    : groupId!;

  const additionalTravelers: Record<string, string>[] = [];
  for (let i = 1; i < groupSize; i++) {
    const raw = m[`traveler_${i}`];
    additionalTravelers.push(raw ? parseTraveler(raw) : { name: "", email: "", age: "", dietary: "" });
  }

  const rows: Record<string, unknown>[] = [];
  rows.push({
    trip_id: tripId,
    departure_id: departureId,
    booking_type: isSolo ? "Solo" : "Group lead",
    group_id: groupId,
    booking_ref: bookingRef,
    group_size: groupSize,
    spot_number: 1,
    friend_names_mentioned: m.friends_mentioned || null,
    lead_name: m.lead_name ?? null,
    lead_email: m.lead_email ?? null,
    lead_phone: m.lead_phone ?? null,
    lead_country: m.lead_country || null,
    lead_age: m.lead_age ? Number(m.lead_age) : null,
    lead_solo: m.lead_solo === "true",
    lead_source: m.lead_source || null,
    additional_travelers: additionalTravelers.length > 0 ? additionalTravelers : null,
    payment_type: paymentType,
    original_price: pricePerSpot || subtotal / groupSize,
    discount_code_id: discountId,
    discount_amount: Math.round(perSpotDiscount * 100) / 100,
    final_price: Math.round(perSpotFinal * 100) / 100,
    amount_paid: Math.round(perSpotPaid * 100) / 100,
    status: "Confirmed",
    stripe_session_id: sessionId,
    utm_source: m.utm_source || null,
    utm_medium: m.utm_medium || null,
    utm_campaign: m.utm_campaign || null,
    utm_content: m.utm_content || null,
  });
  for (let i = 1; i < groupSize; i++) {
    rows.push({
      trip_id: tripId,
      departure_id: departureId,
      booking_type: "Group member",
      group_id: groupId,
      booking_ref: bookingRef,
      group_size: groupSize,
      spot_number: i + 1,
      lead_name: m.lead_name ?? null,
      lead_email: m.lead_email ?? null,
      payment_type: paymentType,
      original_price: pricePerSpot || subtotal / groupSize,
      discount_code_id: discountId,
      discount_amount: Math.round(perSpotDiscount * 100) / 100,
      final_price: Math.round(perSpotFinal * 100) / 100,
      amount_paid: Math.round(perSpotPaid * 100) / 100,
      status: "Confirmed",
      stripe_session_id: sessionId,
    });
  }

  const { data: inserted, error: insErr } = await sb.from("bookings").insert(rows).select("id");
  if (insErr) return { session_id: sessionId, status: "error", detail: insErr.message };

  if (!isSolo && (inserted?.length ?? 0) > 1) {
    const ids = (inserted ?? []).map((r) => r.id);
    for (const r of inserted ?? []) {
      await sb.from("bookings").update({ group_members: ids.filter((id) => id !== r.id) }).eq("id", r.id);
    }
  }

  if (paymentType === "Deposit") {
    try {
      const full = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "payment_intent.payment_method"],
      });
      const pi = full.payment_intent as Stripe.PaymentIntent | null;
      const customerId = (typeof full.customer === "string" ? full.customer : full.customer?.id) ?? null;
      const pmId =
        (typeof pi?.payment_method === "string" ? pi?.payment_method : pi?.payment_method?.id) ?? null;
      const piId = pi?.id ?? null;

      const depDateIso = m.departure_date as string;
      const due = new Date(depDateIso + "T00:00:00Z");
      due.setUTCDate(due.getUTCDate() - 7);
      const balanceDueDate = due.toISOString().slice(0, 10);
      const balancePerSpot = Math.max(0, perSpotFinal - perSpotPaid);
      const nextAttempt = new Date(due);
      nextAttempt.setUTCHours(14, 0, 0, 0);

      await sb
        .from("bookings")
        .update({
          stripe_customer_id: customerId,
          stripe_payment_method_id: pmId,
          stripe_payment_intent_id: piId,
          balance_amount: Math.round(balancePerSpot * 100) / 100,
          balance_due_date: balanceDueDate,
          balance_status: balancePerSpot > 0 && pmId ? "scheduled" : "not_required",
          balance_next_attempt_at: balancePerSpot > 0 && pmId ? nextAttempt.toISOString() : null,
        })
        .eq("stripe_session_id", sessionId);
    } catch (e) {
      console.warn("balance setup failed:", e instanceof Error ? e.message : e);
    }
  }

  if (sendEmails && m.lead_email) {
    try {
      const country =
        (m.trip_name as string)?.split(/[—\-:]/)[0]?.trim() || (m.trip_slug as string) || "your trip";
      const firstName = ((m.lead_name as string) || "").split(" ")[0] || "traveler";
      const isSoloLead = m.lead_solo === "true";
      if (isSoloLead) {
        const balanceTotal = Math.max(0, fullDue - amountPaidTotal);
        const depForDue = new Date(((m.departure_date as string) || "") + "T00:00:00Z");
        depForDue.setUTCDate(depForDue.getUTCDate() - 7);
        const balDue = isNaN(depForDue.getTime()) ? "" : depForDue.toISOString().slice(0, 10);
        const { subject, html } = soloBookingConfirmedEmail({
          firstName,
          tripCountry: country,
          tripName: (m.trip_name as string) || (m.trip_slug as string) || "",
          departureDate: (m.departure_date as string) || "",
          spots: groupSize,
          balanceAmount: `$${balanceTotal.toFixed(2)} ${(session.currency || "usd").toUpperCase()}`,
          balanceDueDate: balDue,
          payBalanceUrl: `${APP_URL}/pay-balance?ref=${encodeURIComponent(bookingRef)}&email=${encodeURIComponent(m.lead_email as string)}`,
          bookingRef,
          bookingUrl: `${APP_URL}/booking-success?session_id=${encodeURIComponent(sessionId)}`,
          hasBalance: balanceTotal > 0,
        });
        await sendEmail({ to: m.lead_email as string, subject, html, templateName: "backfill_booking_confirmation" });
        await sb.from("bookings").update({ trip_confirmed_notified_at: new Date().toISOString() }).eq("stripe_session_id", sessionId);
      } else {
        const { subject, html } = bookingConfirmationEmail({
          firstName,
          tripCountry: country,
          tripName: (m.trip_name as string) || (m.trip_slug as string) || "",
          departureDate: (m.departure_date as string) || "",
          spots: groupSize,
          amount: `$${amountPaidTotal.toFixed(2)} ${(session.currency || "usd").toUpperCase()}`,
          bookingRef,
          bookingUrl: `${APP_URL}/booking-success?session_id=${encodeURIComponent(sessionId)}`,
        });
        await sendEmail({ to: m.lead_email as string, subject, html, templateName: "backfill_trip_confirmed" });
      }

      try {
        const ops = bookingOpsNotificationEmail({
          leadName: (m.lead_name as string) || "Unknown",
          leadEmail: (m.lead_email as string) || "",
          leadPhone: (m.lead_phone as string) || undefined,
          tripName: (m.trip_name as string) || (m.trip_slug as string) || "",
          departureDate: (m.departure_date as string) || "",
          spots: groupSize,
          amount: `$${amountPaidTotal.toFixed(2)} ${(session.currency || "usd").toUpperCase()}`,
          bookingRef,
          squadCode: (m.squad_code as string) || undefined,
          discountCode: (m.discount_code as string) || undefined,
          bookingUrl: `${APP_URL}/admin`,
        });
        const cc = opsCcForTrip(m.trip_name as string | null, m.trip_slug as string | null);
        await sendEmail({
          to: OPS_NOTIFY_EMAILS,
          cc: cc.length ? cc : undefined,
          subject: `[BACKFILL] ${ops.subject}`,
          html: ops.html,
          templateName: "backfill_ops_notification",
        });
      } catch (e) {
        console.warn("ops notify build failed:", e instanceof Error ? e.message : e);
      }
    } catch (e) {
      console.warn("email failed:", e instanceof Error ? e.message : e);
    }
  }

  return { session_id: sessionId, status: "created", detail: `rows=${inserted?.length ?? 0} ref=${bookingRef}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminPw = Deno.env.get("ADMIN_PASSWORD");
  if (!adminPw || req.headers.get("x-admin-password") !== adminPw) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "stripe not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let body: { session_ids?: string[]; payment_intent_ids?: string[]; send_emails?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const sendEmails = body.send_emails !== false;
  const sessionIds = new Set<string>(body.session_ids ?? []);

  for (const piId of body.payment_intent_ids ?? []) {
    try {
      const list = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
      if (list.data[0]) sessionIds.add(list.data[0].id);
    } catch (e) {
      console.warn("lookup by pi failed", piId, e);
    }
  }

  const results: unknown[] = [];
  for (const sid of sessionIds) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sid);
      const kind = (session.metadata as Record<string, string> | null)?.kind;
      if (kind === "balance") {
        results.push({ session_id: sid, status: "skipped_balance_kind" });
        continue;
      }
      const res = await processSession(stripe, session, sendEmails);
      results.push(res);
    } catch (e) {
      results.push({ session_id: sid, status: "error", detail: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
