// Registers UNI Advisors ambassador codes as creator tracking codes, so a
// booking made with an ambassador's link or code is credited to them.
//
// Called by the UNI Advisors desk (different Supabase project, no JWT).
// Auth: x-api-secret header vs app_config('uni_advisors_api_key'); rotate it
// with one UPDATE on both sides.
//
// Body: one object or an array of:
//   { code, active, ref, name?, email? }      ref = "uni:<advisor id>"
//
// active=true  -> create the code as a $0 creator tracking code (same shape as
//                 creator-eligibility: $25 per 7-day booking, $50 per 12+ day),
//                 or re-activate it if this ambassador already owns it.
// active=false -> deactivate it (guests get "code not valid").
//
// Never touches a code it didn't create: a normal discount code, or a creator
// code owned by the Creator Hub, comes back as a conflict and the desk picks
// another code. Creator Hub codes stay managed by creator-eligibility only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CODE = /^[A-Z0-9-]{3,40}$/;
const REF = /^uni:[0-9a-f-]{36}$/;

interface Item { code: string; active: boolean; ref: string; name?: string; email?: string }
type Result = { code: string; status: "created" | "activated" | "deactivated" | "unchanged" | "conflict" | "failed"; error?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jr({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);
  const sb = createClient(url, key);

  const { data: cfg } = await sb.from("app_config").select("value").eq("key", "uni_advisors_api_key").maybeSingle();
  const expected = String(cfg?.value ?? "").trim();
  const presented = (req.headers.get("x-api-secret") ?? "").trim();
  if (!expected) return jr({ error: "Endpoint unavailable" }, 503);
  if (!presented || !safeEqual(presented, expected)) return jr({ error: "Unauthorized" }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return jr({ error: "Invalid JSON" }, 400); }
  const raw: unknown[] = Array.isArray(body) ? body : [body];
  const items: Item[] = [];
  for (const r of raw) {
    const o = r as Record<string, unknown>;
    const code = typeof o?.code === "string" ? o.code.trim().toUpperCase() : "";
    const ref = typeof o?.ref === "string" ? o.ref.trim().toLowerCase() : "";
    if (!CODE.test(code) || typeof o?.active !== "boolean" || !REF.test(ref)) {
      return jr({ error: "Each item needs { code: A-Z 0-9 -, active: boolean, ref: 'uni:<uuid>' }" }, 400);
    }
    items.push({
      code, active: o.active, ref,
      name: typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 120) : undefined,
      email: typeof o.email === "string" && o.email.trim() ? o.email.trim().slice(0, 200) : undefined,
    });
  }
  if (!items.length || items.length > 50) return jr({ error: "Send 1 to 50 items" }, 400);

  const results: Result[] = [];
  for (const it of items) {
    const { data: existing, error: selErr } = await sb
      .from("discount_codes")
      .select("id,is_creator,active,creator_ref")
      .eq("code", it.code)
      .maybeSingle();
    if (selErr) { results.push({ code: it.code, status: "failed", error: selErr.message }); continue; }

    if (existing) {
      // Only codes this endpoint created for this same ambassador are ours to change.
      if (existing.is_creator !== true || existing.creator_ref !== it.ref) {
        results.push({ code: it.code, status: "conflict" });
        continue;
      }
      if (existing.active === it.active) { results.push({ code: it.code, status: "unchanged" }); continue; }
      const patch: Record<string, unknown> = { active: it.active };
      if (it.name) patch.creator_name = it.name;
      if (it.email) patch.creator_email = it.email;
      const { error } = await sb.from("discount_codes").update(patch).eq("id", existing.id);
      results.push(error ? { code: it.code, status: "failed", error: error.message } : { code: it.code, status: it.active ? "activated" : "deactivated" });
      continue;
    }

    if (!it.active) { results.push({ code: it.code, status: "unchanged" }); continue; }
    const { error } = await sb.from("discount_codes").insert({
      code: it.code, discount_amount: 0, discount_type: "fixed", active: true,
      applicable_to: ["All"], expiry_date: null, is_creator: true,
      creator_name: it.name ?? null, creator_email: it.email ?? null,
      creator_ref: it.ref, commission_7day: 25, commission_12day: 50,
    });
    // A race with another insert of the same code reads as a conflict.
    if (error) results.push({ code: it.code, status: /duplicate|unique/i.test(error.message) ? "conflict" : "failed", error: error.message });
    else results.push({ code: it.code, status: "created" });
  }

  return jr({ ok: results.every((r) => r.status !== "failed"), results });
});
