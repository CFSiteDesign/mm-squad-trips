// Validate a discount code against discount_codes (Postgres) with squad_leaders fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { code, tripSlug, amount } = await req.json();
    if (!code || !tripSlug || typeof amount !== "number") {
      return jr({ valid: false, reason: "Missing fields" }, 400);
    }
    const safe = String(code).toUpperCase();

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ valid: false, reason: "Supabase not configured" }, 503);
    const sb = createClient(url, key);

    const { data: d } = await sb
      .from("discount_codes")
      .select("*")
      .eq("code", safe)
      .maybeSingle();

    if (!d) {
      // Squad leader fallback ($0 to booker; reward goes to leader)
      const { data: squad } = await sb
        .from("squad_leaders")
        .select("code")
        .eq("code", safe)
        .maybeSingle();
      if (squad) return jr({ valid: true, discountAmount: 0, newTotal: amount, kind: "squad" });
      return jr({ valid: false, reason: "Code not found" });
    }

    if (!d.active) return jr({ valid: false, reason: "Code inactive" });
    if (d.expiry_date && new Date(d.expiry_date) < new Date()) {
      return jr({ valid: false, reason: "Code expired" });
    }
    if (typeof d.usage_limit === "number" && (d.used_count ?? 0) >= d.usage_limit) {
      return jr({ valid: false, reason: "Code usage limit reached" });
    }
    const appliesTo: string[] = d.applicable_to ?? [];
    const label = SLUG_TO_LABEL[tripSlug];
    if (!appliesTo.includes("All") && !appliesTo.includes(label)) {
      return jr({ valid: false, reason: "Code not valid for this trip" });
    }
    const discountAmount = Number(d.discount_amount) || 0;
    const newTotal = Math.max(0, amount - discountAmount);
    return jr({ valid: true, discountAmount, newTotal });
  } catch (e) {
    return jr({ valid: false, reason: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
