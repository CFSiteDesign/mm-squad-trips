// Request a squad-leader password reset link.
// Always returns ok=true so we don't leak which emails exist.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL, sendEmail, squadPasswordResetEmail } from "../_shared/email.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
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

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return jr({ error: "Valid email required" }, 400);
  }

  const supabase = createClient(url, key);
  const { data: leader } = await supabase
    .from("squad_leaders")
    .select("id, name, code")
    .eq("email", email)
    .maybeSingle();

  // Generic ok response — don't reveal whether the email exists.
  if (!leader) return jr({ ok: true });

  const token = randomToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
  const { error: uErr } = await supabase
    .from("squad_leaders")
    .update({ reset_token: token, reset_token_expires_at: expires })
    .eq("id", leader.id);
  if (uErr) {
    console.error("reset token update failed", uErr.message);
    return jr({ ok: true });
  }

  const { subject, html } = squadPasswordResetEmail({
    leaderName: (leader.name as string | null)?.split(" ")[0] || "there",
    squadCode: leader.code as string,
    resetUrl: `${APP_URL}/squad-leader/reset-password?token=${encodeURIComponent(token)}`,
  });
  await sendEmail({ to: email, subject, html, templateName: "squad_password_reset" });

  return jr({ ok: true });
});
