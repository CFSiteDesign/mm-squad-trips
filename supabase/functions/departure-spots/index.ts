// Current spots remaining for one departure.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
    if (!id) return jr({ error: "id required" }, 400);

    const sbUrl = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!sbUrl || !key) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(sbUrl, key);

    const { data, error } = await sb
      .from("departures")
      .select("spots_remaining,bookable")
      .eq("id", id)
      .maybeSingle();
    if (error) return jr({ error: error.message }, 500);
    if (!data) return jr({ error: "not found" }, 404);
    return jr({
      spotsRemaining: data.spots_remaining ?? 0,
      bookable: data.bookable ?? false,
    });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
