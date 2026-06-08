// One-shot Airtable → Postgres importer. Admin-token guarded. Idempotent.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/airtable";

interface AT<T = Record<string, unknown>> { id: string; fields: T }

async function atList<T = Record<string, unknown>>(table: string): Promise<AT<T>[]> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const airtableKey = Deno.env.get("AIRTABLE_API_KEY");
  const baseId = Deno.env.get("AIRTABLE_BASE_ID");
  if (!lovableKey || !airtableKey || !baseId) throw new Error("Airtable env not configured");
  const out: AT<T>[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams();
    qs.set("pageSize", "100");
    if (offset) qs.set("offset", offset);
    const r = await fetch(`${GATEWAY}/v0/${baseId}/${encodeURIComponent(table)}?${qs}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": airtableKey,
      },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`Airtable ${table} [${r.status}]: ${JSON.stringify(data)}`);
    out.push(...(data.records as AT<T>[]));
    offset = data.offset;
  } while (offset);
  return out;
}

function safeJson<T>(s: unknown, fallback: T): T {
  if (typeof s !== "string") return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await verifyAdminToken(adminAuthHeaderToken(req)))) return jr({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(url, key);

    const report: Record<string, number | string> = {};

    // 1. TRIPS
    type TF = {
      "Trip Code": string; "Trip Name": string; "URL Slug": string;
      "Days"?: number; "Stops"?: string; "Testimonials"?: string;
      "Activity Count"?: number; "Hero Video URL"?: string; "Video Testimonial URL"?: string;
      "Default Price"?: number; "Default Strikethrough"?: number; "Active?"?: boolean;
    };
    const tripsAT = await atList<TF>("Trips");
    const tripIdMap = new Map<string, string>(); // airtable id -> postgres id
    for (const t of tripsAT) {
      const f = t.fields;
      if (!f["Trip Code"] || !f["URL Slug"]) continue;
      const row = {
        code: f["Trip Code"],
        name: f["Trip Name"] ?? "",
        slug: f["URL Slug"],
        days: f["Days"] ?? null,
        stops: safeJson(f["Stops"], []),
        testimonials: safeJson(f["Testimonials"], []),
        activity_count: f["Activity Count"] ?? null,
        hero_video_url: f["Hero Video URL"] ?? null,
        video_testimonial_url: f["Video Testimonial URL"] ?? null,
        default_price: f["Default Price"] ?? 0,
        default_strikethrough: f["Default Strikethrough"] ?? null,
        active: f["Active?"] !== false,
      };
      const { data, error } = await sb
        .from("trips")
        .upsert(row, { onConflict: "slug" })
        .select("id")
        .single();
      if (error) throw new Error(`trips upsert ${f["URL Slug"]}: ${error.message}`);
      tripIdMap.set(t.id, data.id);
    }
    report.trips = tripsAT.length;

    // 2. DEPARTURES
    type DF = {
      Trip?: string[]; "Departure ID"?: string; "Departure Date"?: string;
      "Total Spots"?: number; "Spots Remaining"?: number; "Bookable?"?: boolean;
    };
    const depAT = await atList<DF>("Departures");
    const depIdMap = new Map<string, string>();
    for (const d of depAT) {
      const f = d.fields;
      const linkedTrip = (f.Trip ?? [])[0];
      const tripId = linkedTrip ? tripIdMap.get(linkedTrip) : undefined;
      if (!tripId || !f["Departure Date"]) continue;
      const row = {
        trip_id: tripId,
        departure_code: f["Departure ID"] ?? null,
        departure_date: f["Departure Date"],
        total_spots: f["Total Spots"] ?? 0,
        spots_remaining: f["Spots Remaining"] ?? f["Total Spots"] ?? 0,
        bookable: f["Bookable?"] !== false,
      };
      const { data, error } = await sb
        .from("departures")
        .upsert(row, { onConflict: "trip_id,departure_date" })
        .select("id")
        .single();
      if (error) throw new Error(`departures upsert: ${error.message}`);
      depIdMap.set(d.id, data.id);
    }
    report.departures = depAT.length;

    // 3. PRICING CALENDAR
    type PF = {
      Trip?: string[]; Month?: string; Price?: number;
      Strikethrough?: number; "Active?"?: boolean;
    };
    let pricingCount = 0;
    try {
      const pricingAT = await atList<PF>("Pricing Calendar");
      for (const p of pricingAT) {
        const f = p.fields;
        const linkedTrip = (f.Trip ?? [])[0];
        const tripId = linkedTrip ? tripIdMap.get(linkedTrip) : undefined;
        if (!tripId || !f.Month || typeof f.Price !== "number") continue;
        const { error } = await sb.from("pricing_calendar").upsert({
          trip_id: tripId,
          month: f.Month,
          price: f.Price,
          strikethrough: f.Strikethrough ?? null,
          active: f["Active?"] !== false,
        }, { onConflict: "trip_id,month" });
        if (error) throw new Error(`pricing upsert: ${error.message}`);
        pricingCount++;
      }
    } catch (e) {
      report.pricing_calendar_error = e instanceof Error ? e.message : String(e);
    }
    report.pricing_calendar = pricingCount;

    // 4. DISCOUNT CODES
    type DCF = {
      Code?: string; "Discount Amount"?: string; "Active?"?: boolean;
      "Usage Limit"?: number; "Used Count"?: number; "Expiry Date"?: string;
      "Applicable To"?: string[];
    };
    const discAT = await atList<DCF>("Discount Codes");
    const discIdMap = new Map<string, string>(); // airtable id -> pg id
    for (const d of discAT) {
      const f = d.fields;
      if (!f.Code) continue;
      const amount = Number((f["Discount Amount"] ?? "0").replace(/[^0-9.]/g, "")) || 0;
      const row = {
        code: f.Code.toUpperCase(),
        discount_amount: amount,
        active: f["Active?"] !== false,
        usage_limit: f["Usage Limit"] ?? null,
        used_count: f["Used Count"] ?? 0,
        expiry_date: f["Expiry Date"] ?? null,
        applicable_to: f["Applicable To"] ?? ["All"],
      };
      const { data, error } = await sb
        .from("discount_codes")
        .upsert(row, { onConflict: "code" })
        .select("id")
        .single();
      if (error) throw new Error(`discount upsert ${f.Code}: ${error.message}`);
      discIdMap.set(d.id, data.id);
    }
    report.discount_codes = discAT.length;

    // 5. BOOKINGS
    type BF = Record<string, unknown> & {
      Trip?: string[]; Departure?: string[]; "Booking Type"?: string; "Group ID"?: string;
      "Group Size"?: number; "Spot Number"?: number; "Friend Names Mentioned"?: string;
      "Lead Name"?: string; "Lead Email"?: string; "Lead Phone"?: string;
      "Lead Country"?: string; "Lead Age"?: number; "Solo?"?: boolean; Source?: string;
      "Additional Travelers"?: string; "Payment Type"?: string;
      "Original Price"?: number; "Discount Code"?: string[]; "Discount Amount"?: number;
      "Final Price"?: number; "Amount Paid"?: number; Status?: string;
      "Stripe Session ID"?: string; "UTM Source"?: string; "UTM Medium"?: string;
      "UTM Campaign"?: string; "UTM Content"?: string;
    };
    let bookingsCount = 0;
    try {
      const bookAT = await atList<BF>("Bookings");
      for (const b of bookAT) {
        const f = b.fields;
        if (!f["Stripe Session ID"]) continue;
        const tripId = (f.Trip ?? [])[0] ? tripIdMap.get((f.Trip ?? [])[0]) : null;
        const depId = (f.Departure ?? [])[0] ? depIdMap.get((f.Departure ?? [])[0]) : null;
        const discId = (f["Discount Code"] ?? [])[0]
          ? discIdMap.get((f["Discount Code"] ?? [])[0]) : null;
        const row = {
          trip_id: tripId ?? null,
          departure_id: depId ?? null,
          booking_type: f["Booking Type"] ?? null,
          group_id: f["Group ID"] ?? null,
          group_size: f["Group Size"] ?? 1,
          spot_number: f["Spot Number"] ?? 1,
          friend_names_mentioned: f["Friend Names Mentioned"] ?? null,
          lead_name: f["Lead Name"] ?? null,
          lead_email: f["Lead Email"] ?? null,
          lead_phone: f["Lead Phone"] ?? null,
          lead_country: f["Lead Country"] ?? null,
          lead_age: f["Lead Age"] ?? null,
          lead_solo: f["Solo?"] ?? null,
          lead_source: f.Source ?? null,
          additional_travelers: safeJson(f["Additional Travelers"], null),
          payment_type: f["Payment Type"] ?? null,
          original_price: f["Original Price"] ?? null,
          discount_code_id: discId ?? null,
          discount_amount: f["Discount Amount"] ?? 0,
          final_price: f["Final Price"] ?? null,
          amount_paid: f["Amount Paid"] ?? null,
          status: f.Status ?? "Confirmed",
          stripe_session_id: f["Stripe Session ID"],
          utm_source: f["UTM Source"] ?? null,
          utm_medium: f["UTM Medium"] ?? null,
          utm_campaign: f["UTM Campaign"] ?? null,
          utm_content: f["UTM Content"] ?? null,
        };
        const { error } = await sb.from("bookings").upsert(row, {
          onConflict: "stripe_session_id,spot_number",
        });
        if (error) throw new Error(`bookings upsert: ${error.message}`);
        bookingsCount++;
      }
    } catch (e) {
      report.bookings_error = e instanceof Error ? e.message : String(e);
    }
    report.bookings = bookingsCount;

    return jr({ ok: true, report });
  } catch (e) {
    console.error("admin-import-airtable error", e);
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
