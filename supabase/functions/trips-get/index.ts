// GET trip by slug + future departures + resolved price per departure.
// Returns shape consumed by src/types/trip.ts.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { airtableGet } from "../_shared/airtable.ts";

interface TripFields {
  "Trip Code": string;
  "Trip Name": string;
  "URL Slug": string;
  "Days": number;
  "Stops": string;
  "Testimonials": string;
  "Activity Count": number;
  "Hero Video URL"?: string;
  "Video Testimonial URL"?: string;
  "Default Price": number;
  "Default Strikethrough": number;
  "Active?": boolean;
}

interface PricingFields {
  Trip: string[];
  "Trip Code (from Trip)"?: string[];  // lookup — same pattern as Departures
  Month: string;
  Price: number;
  Strikethrough?: number;
  "Active?": boolean;
}

interface DepartureFields {
  "Departure ID"?: string;
  Trip: string[];
  "Departure Date": string;
  "Total Spots": number;
  "Spots Remaining": number;
  "Bookable?": boolean;
}

function todayPlusDays(d: number): string {
  const t = new Date();
  t.setUTCHours(0, 0, 0, 0);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

function safeJson<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { slug } = await req.json().catch(() => ({}));
    if (!slug || typeof slug !== "string") {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Trip by slug
    const trips = await airtableGet<TripFields>("Trips", {
      filterByFormula: `AND({URL Slug} = "${slug.replace(/"/g, "")}", {Active?} = TRUE())`,
      maxRecords: "1",
    });
    if (trips.length === 0) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tripRec = trips[0];
    const t = tripRec.fields;

    // Departures only — pricing is resolved on the client from a local calendar.
    const minDate = todayPlusDays(7);
    const departures = await airtableGet<DepartureFields>("Departures", {
      filterByFormula: `IS_AFTER({Departure Date}, "${minDate}")`,
      "sort[0][field]": "Departure Date",
      "sort[0][direction]": "asc",
    });

    const tripDepartures = departures.filter((d) => (d.fields.Trip ?? []).includes(tripRec.id));

    const resolvedDepartures = tripDepartures.map((d) => {
      const f = d.fields;
      return {
        id: d.id,
        departureId: f["Departure ID"] ?? `${t["Trip Code"]}-${f["Departure Date"]}`,
        date: f["Departure Date"],
        spotsRemaining: f["Spots Remaining"] ?? f["Total Spots"] ?? 0,
        bookable: f["Bookable?"] === true,
        price: t["Default Price"],
        strikethrough: t["Default Strikethrough"] ?? null,
      };
    });

    const trip = {
      id: tripRec.id,
      code: t["Trip Code"],
      name: t["Trip Name"],
      slug: t["URL Slug"],
      days: t["Days"],
      stops: safeJson(t["Stops"], []),
      testimonials: safeJson(t["Testimonials"], []),
      activityCount: t["Activity Count"],
      heroVideoUrl: t["Hero Video URL"] ?? "",
      videoTestimonialUrl: t["Video Testimonial URL"] ?? "",
      defaultPrice: t["Default Price"],
      defaultStrikethrough: t["Default Strikethrough"] ?? 0,
      departures: resolvedDepartures,
    };

    return new Response(JSON.stringify({ trip }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("trips-get error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
