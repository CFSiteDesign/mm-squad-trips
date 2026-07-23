// Staff-facing leaderboard data, gated by a shared passcode (app_config).
// Returns ONLY aggregate-safe fields (staff name, group size, month) — never
// guest names, emails or booking details. Passcode lives server-side in
// app_config('staff_leaderboard_passcode'); rotate it with a single UPDATE.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return jr({ error: "Backend not configured" }, 503);
    const sb = createClient(url, key);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { return jr({ error: "Invalid JSON" }, 400); }
    const passcode = typeof body.passcode === "string" ? body.passcode.trim().toUpperCase() : "";
    if (!passcode) return jr({ error: "Passcode required" }, 400);

    const { data: cfg, error: cfgErr } = await sb
      .from("app_config")
      .select("value")
      .eq("key", "staff_leaderboard_passcode")
      .maybeSingle();
    if (cfgErr || !cfg?.value) return jr({ error: "Leaderboard unavailable" }, 503);
    if (passcode !== String(cfg.value).trim().toUpperCase()) {
      return jr({ error: "Wrong passcode" }, 401);
    }

    // Lead rows carry staff_recommendation; dedupe by checkout, drop cancelled.
    const { data: rows, error } = await sb
      .from("bookings")
      .select("staff_recommendation,group_size,status,stripe_session_id,id,created_at")
      .not("staff_recommendation", "is", null)
      .limit(5000);
    if (error) return jr({ error: error.message }, 500);

    const seen = new Set<string>();
    const mentions: { name: string; groupSize: number; month: string }[] = [];
    for (const r of rows ?? []) {
      const name = String(r.staff_recommendation ?? "").trim();
      if (!name) continue;
      if (String(r.status ?? "") === "Cancelled") continue;
      const dedupeKey = String(r.stripe_session_id || r.id);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      mentions.push({
        name: name.replace(/\s+/g, " ").slice(0, 80),
        groupSize: Number(r.group_size ?? 1) || 1,
        month: String(r.created_at ?? "").slice(0, 7),
      });
    }
    return jr({ ok: true, mentions });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
