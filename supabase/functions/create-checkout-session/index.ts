// Server-side price resolution + Stripe Checkout session creation.
// - Reads Trip / Departure / Pricing Calendar / Discount from Postgres
// - Re-checks Bookable? and Spots Remaining >= groupSize
// - Resolves price: month override → trip default
// - Applies validated discount code (full price only — not deposits)
// - 7-day rule: $99/spot deposit if departure ≥7 days out, else pay in full
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const DEPOSIT_PER_SPOT = 99;
const DEPOSIT_THRESHOLD_DAYS = 7;
const HIDE_WITHIN_DAYS = 0;

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
};

function daysUntil(iso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00Z");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return err("Stripe is not configured", 503);
  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sbUrl || !sbKey) return err("Supabase is not configured", 503);
  const sb = createClient(sbUrl, sbKey);

  let payload: {
    tripSlug?: string;
    departureId?: string;
    groupSize?: number;
    leadBooker?: Record<string, unknown>;
    travelers?: unknown[];
    discountCode?: string;
    friendsMentioned?: string;
    utm?: Record<string, string>;
  };
  try { payload = await req.json(); } catch { return err("Invalid JSON body"); }

  const { tripSlug, departureId, groupSize, leadBooker, travelers = [], discountCode, friendsMentioned, utm = {} } = payload;
  if (!tripSlug || typeof tripSlug !== "string") return err("tripSlug required");
  if (!departureId || typeof departureId !== "string") return err("departureId required");
  if (!groupSize || typeof groupSize !== "number" || groupSize < 1 || groupSize > 5) return err("groupSize must be 1–5");
  if (!leadBooker || typeof leadBooker !== "object") return err("leadBooker required");
  const lead = leadBooker as Record<string, string>;
  if (!lead.name || !lead.email || !lead.phone) return err("Lead booker name, email, phone required");

  try {
    // 1. Trip
    const { data: trip, error: tErr } = await sb
      .from("trips")
      .select("*")
      .eq("slug", tripSlug)
      .eq("active", true)
      .maybeSingle();
    if (tErr) return err(tErr.message, 500);
    if (!trip) return err("Trip not found or inactive", 404);

    // 2. Departure
    const { data: dep, error: dErr } = await sb
      .from("departures")
      .select("*")
      .eq("id", departureId)
      .maybeSingle();
    if (dErr) return err(dErr.message, 500);
    if (!dep) return err("Departure not found", 404);
    if (dep.trip_id !== trip.id) return err("Departure does not belong to this trip");
    const depDate = dep.departure_date as string;
    const spotsRemaining = dep.spots_remaining ?? dep.total_spots ?? 0;
    if (dep.bookable !== true) return err("This departure is no longer bookable");
    if (spotsRemaining < groupSize) {
      return err(`Only ${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} left`);
    }
    if (daysUntil(depDate) < HIDE_WITHIN_DAYS) return err("This departure is too close to book online");

    // 3. Pricing override
    const month = depDate.slice(0, 7);
    const { data: pm } = await sb
      .from("pricing_calendar")
      .select("price,strikethrough")
      .eq("trip_id", trip.id)
      .eq("month", month)
      .eq("active", true)
      .maybeSingle();
    const pricePerSpot = pm ? Number(pm.price) : Number(trip.default_price);
    const strikethrough = pm?.strikethrough ?? trip.default_strikethrough ?? null;
    const originalPrice = pricePerSpot * groupSize;
    const subtotal = originalPrice;

    // 4. Discount
    let discountAmount = 0;
    let appliedCode: string | null = null;
    let discountRecordId: string | null = null;
    if (discountCode) {
      const safe = String(discountCode).toUpperCase();
      const { data: d } = await sb
        .from("discount_codes")
        .select("*")
        .eq("code", safe)
        .maybeSingle();
      if (d) {
        const expired = d.expiry_date && new Date(d.expiry_date) < new Date();
        const exhausted = typeof d.usage_limit === "number" && (d.used_count ?? 0) >= d.usage_limit;
        const appliesTo: string[] = d.applicable_to ?? [];
        const applies = appliesTo.includes("All") || appliesTo.includes(SLUG_TO_LABEL[tripSlug]);
        if (d.active && !expired && !exhausted && applies) {
          discountAmount = Number(d.discount_amount) || 0;
          appliedCode = safe;
          discountRecordId = d.id;
        }
      }
    }

    // 5. 60-day rule
    const isDeposit = daysUntil(depDate) >= DEPOSIT_THRESHOLD_DAYS;
    const fullDue = Math.max(0, subtotal - discountAmount);
    const amountToday = isDeposit ? DEPOSIT_PER_SPOT * groupSize : fullDue;
    const lineLabel = isDeposit
      ? `${trip.name} — Deposit ($99 × ${groupSize})`
      : `${trip.name} — Pay in full`;

    // 6. Stripe Checkout
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "";

    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: lead.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    } catch (_) { /* ignore */ }

    const metadata: Record<string, string> = {
      trip_slug: tripSlug,
      trip_id: trip.id,
      trip_code: trip.code,
      trip_name: trip.name,
      departure_id: dep.id,
      departure_code: dep.departure_code ?? `${trip.code}-${depDate}`,
      departure_date: depDate,
      group_size: String(groupSize),
      price_per_spot: String(pricePerSpot),
      strikethrough_per_spot: strikethrough != null ? String(strikethrough) : "",
      pricing_source: pm ? "calendar" : "default",
      subtotal: String(subtotal),
      original_price: String(originalPrice),
      discount_code: appliedCode ?? "",
      discount_code_id: discountRecordId ?? "",
      discount_amount: String(discountAmount),
      final_price: String(fullDue),
      full_due: String(fullDue),
      amount_today: String(amountToday),
      payment_type: isDeposit ? "deposit" : "full",
      lead_name: lead.name,
      lead_email: lead.email,
      lead_phone: lead.phone,
      lead_country: lead.country ?? "",
      lead_age: lead.age ?? "",
      lead_source: lead.source ?? "",
      lead_solo: String(lead.solo ?? ""),
      friends_mentioned: friendsMentioned ?? "",
      utm_source: utm.utm_source ?? "",
      utm_medium: utm.utm_medium ?? "",
      utm_campaign: utm.utm_campaign ?? "",
      utm_content: utm.utm_content ?? "",
    };

    (travelers as Array<Record<string, string>>).slice(0, 4).forEach((t, i) => {
      const compact = [t.name ?? "", t.email ?? "", t.age ?? "", t.dietary ?? ""]
        .map((s) => String(s).replace(/\|/g, "/")).join("|");
      metadata[`traveler_${i + 1}`] = compact.slice(0, 490);
    });

    const showDiscount = !isDeposit && discountAmount > 0 && appliedCode;
    let discountsParam: Array<{ coupon: string }> | undefined;
    if (showDiscount) {
      try {
        const coupon = await stripe.coupons.create({
          amount_off: Math.round(discountAmount * 100),
          currency: "usd",
          duration: "once",
          name: `Discount ${appliedCode}`,
          max_redemptions: 1,
          metadata: { code: appliedCode!, trip_slug: tripSlug },
        });
        discountsParam = [{ coupon: coupon.id }];
      } catch (e) {
        console.error("coupon create failed, falling back to net price", e);
      }
    }
    const lineUnitAmount = discountsParam ? originalPrice : amountToday;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : lead.email,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(lineUnitAmount * 100),
          product_data: {
            name: lineLabel,
            description: `${groupSize} spot${groupSize === 1 ? "" : "s"} · departs ${depDate}`,
          },
        },
        quantity: 1,
      }],
      discounts: discountsParam,
      metadata,
      payment_intent_data: {
        metadata,
        description: `${trip.name} × ${groupSize} · ${depDate}`,
        ...(isDeposit ? { setup_future_usage: "off_session" as const } : {}),
      },
      ...(isDeposit
        ? {
            custom_text: {
              submit: {
                message:
                  `You're paying a $${DEPOSIT_PER_SPOT * groupSize} deposit today. ` +
                  `The remaining balance of $${(fullDue - amountToday).toFixed(0)} will be automatically charged to this card 7 days before departure (${depDate}). ` +
                  `If the charge fails we'll retry every 2 days and email you.`,
              },
            },
          }
        : {}),
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${tripSlug}?cancelled=1#booking`,
    });


    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("create-checkout-session error", msg);
    return err(msg, 500);
  }
});
