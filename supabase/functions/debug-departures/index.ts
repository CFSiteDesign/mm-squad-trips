import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { airtableGet } from "../_shared/airtable.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const all = await airtableGet("Departures", { maxRecords: "20" });
    return new Response(
      JSON.stringify({ count: all.length, sample: all.map((r) => ({ id: r.id, fields: r.fields })) }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
