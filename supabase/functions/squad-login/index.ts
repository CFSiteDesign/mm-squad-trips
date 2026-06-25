// Log in a Squad Leader by squad code + password, return their access_token.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyPassword } from "../_shared/password.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return jr({ error: "Invalid JSON" }, 400);
  }

  const code = (body.code ?? "").trim();
  const password = body.password ?? "";
  if (!code || !password) return jr({ error: "Squad code and password are required" }, 400);

  const supabase = createClient(url, key);
  const { data: leader, error } = await supabase
    .from("squad_leaders")
    .select("id, access_token, password_hash, status")
    .eq("code", code)
    .maybeSingle();
  if (error) return jr({ error: error.message }, 500);
  if (!leader || !leader.password_hash) {
    return jr({ error: "Invalid squad code or password" }, 401);
  }
  if (leader.status && leader.status !== "approved") {
    return jr({ error: "Your application is still being reviewed" }, 403);
  }

  const ok = await verifyPassword(password, leader.password_hash);
  if (!ok) return jr({ error: "Invalid squad code or password" }, 401);

  return jr({ accessToken: leader.access_token });
});
