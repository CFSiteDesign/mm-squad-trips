// Validate a discount code against the Discount Codes table.
// One per booking, never stacks. Applies to full price, not deposit.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { airtableGet } from "../_shared/airtable.ts";

interface DiscountFields {
  Code: string;
  "Discount Amount": string;        // "$50" / "$100" (single select)
  "Active?": boolean;
  "Usage Limit"?: number;
  "Used Count"?: number;
  "Expiry Date"?: string;
  "Applicable To": string[];        // ["Indonesia"], ["All"], etc.
}

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
};

function parseDollar(s: string): number {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { code, tripSlug, amount } = await req.json();
    if (!code || !tripSlug || typeof amount !== "number") {
      return new Response(JSON.stringify({ valid: false, reason: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safe = String(code).toUpperCase().replace(/"/g, "");
    const rows = await airtableGet<DiscountFields>("Discount Codes", {
      filterByFormula: `UPPER({Code}) = "${safe}"`,
      maxRecords: "1",
    });
    if (rows.length === 0) {
      // Fall back to Squad Leader codes (stored in Lovable Cloud, not Airtable).
      // A matching squad code is valid but applies $0 to the booker — the
      // reward goes to the leader, tracked via stripe-webhook.
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        try {
          const sb = createClient(url, key);
          const { data: squad } = await sb
            .from("squad_leaders")
            .select("code")
            .eq("code", safe)
            .maybeSingle();
          if (squad) {
            return jr({ valid: true, discountAmount: 0, newTotal: amount, kind: "squad" });
          }
        } catch (e) {
          console.warn("squad fallback failed", e);
        }
      }
      return jr({ valid: false, reason: "Code not found" });
    }
    const d = rows[0].fields;
    if (!d["Active?"]) return jr({ valid: false, reason: "Code inactive" });
    if (d["Expiry Date"] && new Date(d["Expiry Date"]) < new Date()) {
      return jr({ valid: false, reason: "Code expired" });
    }
    if (typeof d["Usage Limit"] === "number" && (d["Used Count"] ?? 0) >= d["Usage Limit"]) {
      return jr({ valid: false, reason: "Code usage limit reached" });
    }
    const appliesTo = d["Applicable To"] ?? [];
    const label = SLUG_TO_LABEL[tripSlug];
    if (!appliesTo.includes("All") && !appliesTo.includes(label)) {
      return jr({ valid: false, reason: "Code not valid for this trip" });
    }
    const discountAmount = parseDollar(d["Discount Amount"]);
    const newTotal = Math.max(0, amount - discountAmount);
    return jr({ valid: true, discountAmount, newTotal });
  } catch (e) {
    return jr({ valid: false, reason: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
