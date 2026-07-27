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
    const { slug, squadCode } = await req.json().catch(() => ({}));
    if (!slug || typeof slug !== "string") return jr({ error: "slug required" }, 400);
    // A squad code reveals that squad's private custom departure(s) only.
    // Strip to [A-Z0-9-] — this value is interpolated into a PostgREST `or`
    // filter, so punctuation must never reach it.
    const revealCode = typeof squadCode === "string" && squadCode.trim()
      ? (squadCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40) || null)
      : null;

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
    let depQuery = sb
      .from("departures")
      .select("*")
      .eq("trip_id", trip.id)
      .gt("departure_date", minDate)
      .neq("status", "cancelled");
    // Private (guest-created) dates never appear in public browsing. Supplying a
    // squad code additionally reveals the private dates owned by that code.
    depQuery = revealCode
      ? depQuery.or(`visibility.eq.public,and(visibility.eq.private,owner_code.eq.${revealCode})`)
      : depQuery.eq("visibility", "public");
    const { data: deps, error: dErr } = await depQuery.order("departure_date", { ascending: true });
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
        isPrivate: d.visibility === "private",
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
      /** Only weekday this trip may depart on (Sun=0 … Sat=6, UTC). */
      startWeekday: trip.start_weekday ?? null,
      departures: resolvedDepartures,
    };

    return new Response(JSON.stringify({ trip: out }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // A code-revealed response contains a squad's private dates — it must
        // never sit in a shared cache where another visitor could receive it.
        "Cache-Control": revealCode
          ? "private, no-store"
          : "public, s-maxage=300, stale-while-revalidate=600",
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
