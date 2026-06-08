import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Supabase not configured");
    const sb = createClient(url, key);
    const { data, error } = await sb
      .from("departures")
      .select("id,trip_id,departure_date,total_spots,spots_remaining,bookable")
      .order("departure_date", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({ count: data?.length ?? 0, sample: data }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
