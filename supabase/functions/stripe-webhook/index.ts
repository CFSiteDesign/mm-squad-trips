// Stripe webhook → Postgres bookings.
// - Verifies signature (STRIPE_WEBHOOK_SECRET)
// - Handles checkout.session.completed
// - Idempotent: skips if a booking with the same Stripe Session ID exists
// - Multi-traveler: writes N rows (1 lead + N-1 members) sharing a Group ID
// - Trigger recomputes departures.spots_remaining and discount_codes.used_count
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
  squadMemberJoinedEmail,
  squadMilestoneEmail,
} from "../_shared/email.ts";

function envClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("webhook not configured", { status: 503, headers: corsHeaders });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400, headers: corsHeaders });

  const raw = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Signature verification failed:", msg);
    return new Response(`Bad signature: ${msg}`, { status: 400, headers: corsHeaders });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = (session.metadata as Record<string, string> | null)?.kind;
      if (kind === "balance") {
        await markBalancePaid(session);
      } else {
        await writeBookings(session);
      }
    } else {
      console.log("Ignoring event type:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Webhook handler error:", msg);
    return new Response(JSON.stringify({ received: true, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseTraveler(v: string): Record<string, string> {
  const [name = "", email = "", age = "", dietary = ""] = v.split("|");
  return { name, email, age, dietary };
}

async function nextSequencedRef(
  sb: ReturnType<typeof envClient>,
  column: "group_id" | "booking_ref",
  prefix: string,
): Promise<string> {
  const { data } = await sb
    .from("bookings")
    .select(column)
    .like(column, `${prefix}%`);
  let max = 0;
  for (const r of data ?? []) {
    const v = (r as Record<string, unknown>)[column] as string | null;
    if (!v) continue;
    const n = parseInt(v.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}


async function writeBookings(session: Stripe.Checkout.Session) {
  const sb = envClient();
  const m = session.metadata ?? {};
  const sessionId = session.id;

  // Idempotency
  const { data: existing } = await sb
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .limit(1);
  if ((existing ?? []).length > 0) {
    console.log("Booking already exists for", sessionId);
    return;
  }

  // Resolve trip + departure ids (metadata carries Postgres uuids set by create-checkout-session)
  let tripId: string | null = m.trip_id || null;
  if (!tripId && m.trip_slug) {
    const { data: t } = await sb.from("trips").select("id").eq("slug", m.trip_slug).maybeSingle();
    tripId = t?.id ?? null;
  }
  const departureId: string | null = m.departure_id || null;

  // Discount id: metadata if set, else lookup
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
    const raw = (m as Record<string, string>)[`traveler_${i}`];
    additionalTravelers.push(
      raw ? parseTraveler(raw) : { name: "", email: "", age: "", dietary: "" },
    );
  }

  const rows: Record<string, unknown>[] = [];
  // Lead
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
  // Members
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
  if (insErr) throw new Error(`bookings insert: ${insErr.message}`);
  console.log(`Created ${inserted?.length ?? 0} booking row(s) for ${sessionId} group ${groupId}`);

  // Link group members (best-effort)
  if (!isSolo && (inserted?.length ?? 0) > 1) {
    const ids = (inserted ?? []).map((r) => r.id);
    try {
      for (const r of inserted ?? []) {
        await sb.from("bookings")
          .update({ group_members: ids.filter((id) => id !== r.id) })
          .eq("id", r.id);
      }
    } catch (e) {
      console.warn("group_members link failed:", e instanceof Error ? e.message : e);
    }
  }

  // Card-on-file + balance schedule for deposit bookings
  if (paymentType === "Deposit") {
    try {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const full = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent", "payment_intent.payment_method"],
      });
      const pi = full.payment_intent as Stripe.PaymentIntent | null;
      const customerId = (typeof full.customer === "string" ? full.customer : full.customer?.id) ?? null;
      const pmId =
        (typeof pi?.payment_method === "string" ? pi?.payment_method : pi?.payment_method?.id) ??
        null;
      const piId = pi?.id ?? null;

      const depDateIso = m.departure_date as string;
      // Balance due 7 days before departure (UTC)
      const due = new Date(depDateIso + "T00:00:00Z");
      due.setUTCDate(due.getUTCDate() - 7);
      const balanceDueDate = due.toISOString().slice(0, 10);
      const balancePerSpot = Math.max(0, perSpotFinal - perSpotPaid);

      const nowIso = new Date().toISOString();
      const nextAttempt = new Date(due);
      // first attempt at the due date at 14:00 UTC
      nextAttempt.setUTCHours(14, 0, 0, 0);

      const { error: updErr } = await sb
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
      if (updErr) console.warn("balance schedule update failed:", updErr.message);
      else console.log(`Scheduled balance ${balancePerSpot} per spot for ${sessionId}, due ${balanceDueDate}`);
    } catch (e) {
      console.warn("balance setup failed:", e instanceof Error ? e.message : e);
    }
  }


  // Squad leader credit
  if (m.discount_code) {
    try {
      const { data: leader } = await sb
        .from("squad_leaders")
        .select("id")
        .eq("code", m.discount_code)
        .maybeSingle();
      if (leader) {
        const { error: sErr } = await sb.from("squad_bookings").insert({
          squad_leader_id: leader.id,
          booker_name: m.lead_name ?? null,
          booker_email: m.lead_email ?? null,
          trip_slug: m.trip_slug ?? null,
          departure_date: m.departure_date ?? null,
          stripe_session_id: sessionId,
        });
        if (sErr && !`${sErr.message}`.toLowerCase().includes("duplicate")) {
          console.warn("squad_bookings insert failed:", sErr.message);
        }

        // Notify the squad leader (member-joined + milestone if applicable)
        try {
          const { data: full } = await sb
            .from("squad_leaders")
            .select("id, name, email, code")
            .eq("id", leader.id)
            .maybeSingle();
          const { count } = await sb
            .from("squad_bookings")
            .select("id", { count: "exact", head: true })
            .eq("squad_leader_id", leader.id);
          const bookingsCount = count ?? 0;
          const dashboardUrl = `${APP_URL}/squad-leader/login`;
          if (full?.email) {
            const leaderFirst = (full.name as string | null)?.split(" ")[0] || "captain";
            const nextRewardObj =
              bookingsCount < 4
                ? { at: 4, text: "50% off your trip" }
                : bookingsCount < 8
                  ? { at: 8, text: "a free trip" }
                  : { at: bookingsCount, text: "the next perk" };
            const joined = squadMemberJoinedEmail({
              leaderName: leaderFirst,
              memberName: (m.lead_name as string) || "A new booker",
              tripName: (m.trip_name as string) || "their trip",
              bookingsCount,
              toNextMilestone: String(Math.max(0, nextRewardObj.at - bookingsCount)),
              nextReward: nextRewardObj.text,
              dashboardUrl,
            });
            sendEmail({ to: full.email as string, subject: joined.subject, html: joined.html }).catch(
              (e) => console.warn("squad-member-joined email failed", e),
            );
            if (bookingsCount === 4 || bookingsCount === 8) {
              const milestone = squadMilestoneEmail({
                leaderName: leaderFirst,
                squadCode: (full.code as string) ?? "",
                bookingsCount,
                milestoneHeadline: bookingsCount === 8 ? "Free trip unlocked" : "50% off unlocked",
                rewardText:
                  bookingsCount === 8 ? "Your trip is on the house" : "Your trip is half price",
                nextStepText:
                  bookingsCount === 8
                    ? "We'll be in touch to lock in your free trip."
                    : "Keep going — 4 more bookings unlocks a free trip.",
                dashboardUrl,
              });
              sendEmail({ to: full.email as string, subject: milestone.subject, html: milestone.html })
                .catch((e) => console.warn("squad-milestone email failed", e));
            }
          }
        } catch (e) {
          console.warn("squad notify failed:", e instanceof Error ? e.message : e);
        }
      }
    } catch (e) {
      console.warn("Squad credit failed:", e instanceof Error ? e.message : e);
    }
  }

  // Booking confirmation to the lead booker
  try {
    if (m.lead_email) {
      const country = (m.trip_name as string)?.split(/[—\-:]/)[0]?.trim() || (m.trip_slug as string) || "your trip";
      const firstName = ((m.lead_name as string) || "").split(" ")[0] || "traveler";
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
      sendEmail({ to: m.lead_email as string, subject, html }).catch((e) =>
        console.warn("booking-confirmation email failed", e),
      );

      // Ops team notification — single email to the internal crew
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
        sendEmail({ to: OPS_NOTIFY_EMAILS, cc: cc.length ? cc : undefined, subject: ops.subject, html: ops.html }).catch((e) =>
          console.warn("booking ops email failed", e),
        );
      } catch (e) {
        console.warn("ops notify build failed:", e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    console.warn("booking confirmation email build failed:", e instanceof Error ? e.message : e);
  }
}

// Handles checkout.session.completed for the balance-payment-link flow:
// guests pay their outstanding balance manually via the link from the
// "Trip Confirmed" or 7-day reminder emails.
async function markBalancePaid(session: Stripe.Checkout.Session) {
  const sb = envClient();
  const m = (session.metadata as Record<string, string> | null) ?? {};
  const originalSessionId = m.original_session_id;
  const bookingRef = m.booking_ref;
  if (!originalSessionId && !bookingRef) {
    console.warn("balance webhook missing identifiers", session.id);
    return;
  }

  const baseSelect = sb
    .from("bookings")
    .select("id,amount_paid,balance_amount,balance_status");
  const { data: rows } = originalSessionId
    ? await baseSelect.eq("stripe_session_id", originalSessionId)
    : await baseSelect.eq("booking_ref", bookingRef);
  if (!rows?.length) {
    console.warn("balance webhook: no bookings matched", { originalSessionId, bookingRef });
    return;
  }

  const updates = {
    balance_status: "charged",
    balance_charged_at: new Date().toISOString(),
    balance_last_error: null,
    balance_next_attempt_at: null,
    stripe_balance_payment_intent_id: session.payment_intent as string,
    payment_type: "Full",
  };
  if (originalSessionId) {
    await sb.from("bookings").update(updates).eq("stripe_session_id", originalSessionId);
  } else {
    await sb.from("bookings").update(updates).eq("booking_ref", bookingRef);
  }

  // Roll the per-spot amount_paid forward
  for (const r of rows) {
    const paid = Number(r.amount_paid ?? 0) + Number(r.balance_amount ?? 0);
    await sb.from("bookings").update({ amount_paid: Math.round(paid * 100) / 100 }).eq("id", r.id);
  }

  console.log(`✓ balance link paid for ${originalSessionId ?? bookingRef}`);
}
