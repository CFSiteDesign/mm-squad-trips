// Set (or update) the password for a Squad Leader, authenticated by access_token.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { hashPassword } from "../_shared/password.ts";
import { APP_URL, sendEmail, squadPasswordSetEmail } from "../_shared/email.ts";

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

  const token = (body.accessToken ?? "").trim();
  const password = body.password ?? "";
  if (!token) return jr({ error: "Missing access token" }, 400);
  if (typeof password !== "string" || password.length < 6) {
    return jr({ error: "Password must be at least 6 characters" }, 400);
  }

  const supabase = createClient(url, key);
  const { data: leader, error: lErr } = await supabase
    .from("squad_leaders")
    .select("id")
    .eq("access_token", token)
    .maybeSingle();
  if (lErr) return jr({ error: lErr.message }, 500);
  if (!leader) return jr({ error: "Invalid or expired link" }, 404);

  const password_hash = await hashPassword(password);
  const { error: uErr } = await supabase
    .from("squad_leaders")
    .update({ password_hash })
    .eq("id", leader.id);
  if (uErr) return jr({ error: uErr.message }, 500);

  return jr({ ok: true });
});
