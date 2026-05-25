// Returns current spots remaining for a single departure (for live counter).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { airtableGet } from "../_shared/airtable.ts";

interface DepFields { "Spots Remaining": number; "Bookable?": boolean }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
    if (!id) return jr({ error: "id required" }, 400);
    const rows = await airtableGet<DepFields>("Departures", {
      filterByFormula: `RECORD_ID() = "${String(id).replace(/"/g, "")}"`,
      maxRecords: "1",
    });
    if (!rows[0]) return jr({ error: "not found" }, 404);
    return jr({
      spotsRemaining: rows[0].fields["Spots Remaining"] ?? 0,
      bookable: rows[0].fields["Bookable?"] ?? false,
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
