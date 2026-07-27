// Receives the "ALL IN eligible: yes/no" flag per creator code from the
// Creator Hub (mm-influencer-hub). The Creator Hub is the ONLY place this is
// managed — this endpoint just obeys.
//
// Auth: x-api-secret header vs CREATOR_HUB_API_SECRET (shared with the hub).
// Body: one object or an array of:
//   { code, eligible, name?, email?, creator_id? }
//
// eligible=true  → upsert the code as an active $0 creator tracking code
//                  ($25 per 7-day booking, $50 per 12+ day, no expiry).
// eligible=false → deactivate it (guests get "code not valid"). Only ever
//                  touches is_creator codes — a clash with a normal discount
//                  code is reported, not overwritten.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Item { code: string; eligible: boolean; name?: string; email?: string; creator_id?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("CREATOR_HUB_API_SECRET");
  if (!expected) return jr({ error: "Backend not configured" }, 503);
  if (req.headers.get("x-api-secret") !== expected) return jr({ error: "Unauthorized" }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return jr({ error: "Invalid JSON" }, 400); }
  const raw: unknown[] = Array.isArray(body) ? body : [body];

  const items: Item[] = [];
  for (const r of raw) {
    const o = r as Record<string, unknown>;
    if (typeof o?.code !== "string" || !o.code.trim() || typeof o?.eligible !== "boolean") {
      return jr({ error: "Each item needs { code: string, eligible: boolean }" }, 400);
    }
    items.push({
      code: o.code.trim().toUpperCase(),
      eligible: o.eligible,
      name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : undefined,
      email: typeof o.email === "string" && o.email.trim() ? o.email.trim() : undefined,
      creator_id: typeof o.creator_id === "string" && o.creator_id.trim() ? o.creator_id.trim() : undefined,
    });
  }
  if (!items.length) return jr({ error: "No items" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);
  const sb = createClient(url, key);

  let enabled = 0, disabled = 0, created = 0;
  const conflicts: string[] = [];
  const failures: { code: string; error: string }[] = [];

  for (const it of items) {
    const { data: existing, error: selErr } = await sb
      .from("discount_codes")
      .select("id,is_creator,active")
      .eq("code", it.code)
      .maybeSingle();
    if (selErr) { failures.push({ code: it.code, error: selErr.message }); continue; }

    if (existing && existing.is_creator !== true) {
      // A real discount code with the same name — never repurpose it silently.
      conflicts.push(it.code);
      continue;
    }

    if (existing) {
      const patch: Record<string, unknown> = { active: it.eligible };
      if (it.name) patch.creator_name = it.name;
      if (it.email) patch.creator_email = it.email;
      if (it.creator_id) patch.creator_ref = it.creator_id;
      const { error } = await sb.from("discount_codes").update(patch).eq("id", existing.id);
      if (error) failures.push({ code: it.code, error: error.message });
      else it.eligible ? enabled++ : disabled++;
    } else if (it.eligible) {
      const { error } = await sb.from("discount_codes").insert({
        code: it.code, discount_amount: 0, discount_type: "fixed", active: true,
        applicable_to: ["All"], expiry_date: null, is_creator: true,
        creator_name: it.name ?? null, creator_email: it.email ?? null,
        creator_ref: it.creator_id ?? null, commission_7day: 25, commission_12day: 50,
      });
      if (error) failures.push({ code: it.code, error: error.message });
      else { created++; enabled++; }
    }
    // eligible=false for a code that doesn't exist: nothing to do.
  }

  return jr({
    ok: failures.length === 0 && conflicts.length === 0,
    enabled, disabled, created, conflicts, failures,
  });
});
