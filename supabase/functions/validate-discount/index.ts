// Validate a discount code against discount_codes (Postgres) with squad_leaders fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SLUG_TO_LABEL: Record<string, string> = {
  indonesia: "Indonesia",
  "indonesia-7": "Indonesia",
  cambodia: "Cambodia",
  vietnam: "Vietnam",
  "vietnam-7": "Vietnam",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { code, secondCode, tripSlug, amount, departureDate } = await req.json();
    if (!code || !tripSlug || typeof amount !== "number") {
      return jr({ valid: false, reason: "Missing fields" }, 400);
    }
    const safe = String(code).toUpperCase();
    const safe2 = secondCode ? String(secondCode).toUpperCase() : null;
    if (safe2 && safe2 === safe) return jr({ valid: false, reason: "Enter two different codes" });

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ valid: false, reason: "Supabase not configured" }, 503);
    const sb = createClient(url, key);

    // Shared validity check — returns a reason string, or null if the code is usable.
    const label = SLUG_TO_LABEL[tripSlug];
    const checkCode = (d: Record<string, unknown>, name: string): string | null => {
      if (!d.active) return `${name} is inactive`;
      if (d.expiry_date && new Date(String(d.expiry_date)) < new Date()) return `${name} has expired`;
      if (typeof d.usage_limit === "number" && (Number(d.used_count) || 0) >= d.usage_limit) {
        return `${name} has reached its usage limit`;
      }
      const appliesTo = (d.applicable_to as string[] | null) ?? [];
      if (!appliesTo.includes("All") && !appliesTo.includes(label)) return `${name} is not valid for this trip`;
      const months = (d.applicable_months as number[] | null) ?? [];
      if (months.length > 0) {
        const depMonth = departureDate ? new Date(String(departureDate) + "T00:00:00Z").getUTCMonth() + 1 : null;
        if (!depMonth || !months.includes(depMonth)) {
          const names = months.map((m) => MONTH_NAMES[m - 1] ?? m).join("/");
          return `${name} is only valid for ${names} departures`;
        }
      }
      return null;
    };

    const { data: d } = await sb
      .from("discount_codes")
      .select("*")
      .eq("code", safe)
      .maybeSingle();

    if (!d) {
      if (safe2) return jr({ valid: false, reason: "Code not found" });
      // Squad leader fallback ($0 to booker; reward goes to leader)
      const { data: squad } = await sb
        .from("squad_leaders")
        .select("code")
        .eq("code", safe)
        .maybeSingle();
      if (squad) return jr({ valid: true, discountAmount: 0, newTotal: amount, kind: "squad" });
      return jr({ valid: false, reason: "Code not found" });
    }

    const firstErr = checkCode(d, "Code");
    if (firstErr) return jr({ valid: false, reason: firstErr });

    // ── Two-code stacking (Michele 27 Jul): one fixed + one percent, both
    // flagged stackable, fixed comes off first, then the % on the remainder.
    if (safe2) {
      const { data: d2 } = await sb
        .from("discount_codes")
        .select("*")
        .eq("code", safe2)
        .maybeSingle();
      if (!d2) return jr({ valid: false, reason: "Second code not found" });
      const secondErr = checkCode(d2, "Second code");
      if (secondErr) return jr({ valid: false, reason: secondErr });
      if (d.is_creator === true || d2.is_creator === true) {
        return jr({ valid: false, reason: "Creator codes can't be combined with other codes" });
      }
      if (d.stackable !== true || d2.stackable !== true) {
        return jr({ valid: false, reason: "These codes can't be combined" });
      }
      const types = [d.discount_type, d2.discount_type];
      if (!(types.includes("fixed") && types.includes("percent"))) {
        return jr({ valid: false, reason: "Combine one fixed code with one percent code" });
      }
      const fixedRow = d.discount_type === "fixed" ? d : d2;
      const pctRow = d.discount_type === "percent" ? d : d2;
      const fixed = Number(fixedRow.discount_amount) || 0;
      const pct = Math.min(100, Math.max(0, Number(pctRow.discount_amount) || 0));
      let discountAmount = Math.round((fixed + Math.max(0, amount - fixed) * (pct / 100)) * 100) / 100;
      const { data: capRow } = await sb
        .from("app_config").select("value").eq("key", "max_discount_usd").maybeSingle();
      const cap = Number(capRow?.value) || 0;
      const capped = cap > 0 && discountAmount > cap;
      if (capped) discountAmount = cap;
      return jr({
        valid: true,
        discountAmount,
        newTotal: Math.max(0, amount - discountAmount),
        discountType: "stacked",
        stackFixed: fixed,
        stackPercent: pct,
        capped: capped || undefined,
      });
    }
    // Percent codes: discount_amount holds the percentage (e.g. 20 = 20% of subtotal).
    // Stacked codes (fixed + stack_percent): the fixed comes off FIRST, then the
    // percent applies to the remainder (Michele 27 Jul) — e.g. $150 + 20% on
    // $850 = 150 + 700×20% = $290. app_config max_discount_usd caps the total.
    const isPercent = d.discount_type === "percent";
    const raw = Number(d.discount_amount) || 0;
    const stackPct = !isPercent ? Math.min(100, Math.max(0, Number(d.stack_percent) || 0)) : 0;
    let discountAmount = isPercent
      ? Math.round(amount * Math.min(100, Math.max(0, raw))) / 100
      : raw;
    if (stackPct > 0) {
      const afterFixed = Math.max(0, amount - raw);
      discountAmount = Math.round((raw + afterFixed * (stackPct / 100)) * 100) / 100;
    }
    const { data: capRow } = await sb
      .from("app_config").select("value").eq("key", "max_discount_usd").maybeSingle();
    const cap = Number(capRow?.value) || 0;
    const capped = cap > 0 && discountAmount > cap;
    if (capped) discountAmount = cap;
    const newTotal = Math.max(0, amount - discountAmount);
    return jr({
      valid: true,
      discountAmount,
      newTotal,
      discountType: stackPct > 0 ? "stacked" : isPercent ? "percent" : "fixed",
      percent: isPercent ? raw : undefined,
      stackFixed: stackPct > 0 ? raw : undefined,
      stackPercent: stackPct > 0 ? stackPct : undefined,
      capped: capped || undefined,
      // Lets the booking form offer a second-code input for stackable codes.
      stackable: d.stackable === true,
      // Creator tracking codes: $0 off, booking enters the shared prize draw.
      isCreator: d.is_creator === true,
      creatorName: d.creator_name ?? undefined,
    });
  } catch (e) {
    return jr({ valid: false, reason: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
