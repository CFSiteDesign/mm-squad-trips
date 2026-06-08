// GET trip by slug + future departures. Reads from Postgres.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function todayPlusDays(d: number): string {
  const t = new Date();
  t.setUTCHours(0, 0, 0, 0);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { slug } = await req.json().catch(() => ({}));
    if (!slug || typeof slug !== "string") return jr({ error: "slug required" }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(url, key);

    const { data: trip, error: tErr } = await sb
      .from("trips")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (tErr) return jr({ error: tErr.message }, 500);
    if (!trip) return jr({ error: "Trip not found" }, 404);

    const minDate = todayPlusDays(7);
    const { data: deps, error: dErr } = await sb
      .from("departures")
      .select("*")
      .eq("trip_id", trip.id)
      .gt("departure_date", minDate)
      .order("departure_date", { ascending: true });
    if (dErr) return jr({ error: dErr.message }, 500);

    // Pricing override per month (optional table — client also has local fallback)
    const { data: pricing } = await sb
      .from("pricing_calendar")
      .select("month,price,strikethrough,active")
      .eq("trip_id", trip.id)
      .eq("active", true);
    const priceByMonth = new Map<string, { price: number; strikethrough: number | null }>();
    for (const p of pricing ?? []) {
      priceByMonth.set(p.month, { price: Number(p.price), strikethrough: p.strikethrough });
    }

    const resolvedDepartures = (deps ?? []).map((d) => {
      const month = (d.departure_date as string).slice(0, 7);
      const pm = priceByMonth.get(month);
      return {
        id: d.id,
        departureId: d.departure_code ?? `${trip.code}-${d.departure_date}`,
        date: d.departure_date,
        spotsRemaining: d.spots_remaining ?? d.total_spots ?? 0,
        bookable: d.bookable === true,
        price: pm?.price ?? Number(trip.default_price),
        strikethrough: pm?.strikethrough ?? trip.default_strikethrough ?? null,
      };
    });

    const out = {
      id: trip.id,
      code: trip.code,
      name: trip.name,
      slug: trip.slug,
      days: trip.days,
      stops: Array.isArray(trip.stops) ? trip.stops : [],
      testimonials: Array.isArray(trip.testimonials) ? trip.testimonials : [],
      activityCount: trip.activity_count,
      heroVideoUrl: trip.hero_video_url ?? "",
      videoTestimonialUrl: trip.video_testimonial_url ?? "",
      defaultPrice: Number(trip.default_price),
      defaultStrikethrough: Number(trip.default_strikethrough ?? 0),
      departures: resolvedDepartures,
    };

    return new Response(JSON.stringify({ trip: out }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("trips-get error", msg);
    return jr({ error: msg }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
