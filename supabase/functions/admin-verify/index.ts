// POST {password} → {token}
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { issueAdminToken } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const adminPw = Deno.env.get("ADMIN_PASSWORD");
    const studentPw = Deno.env.get("STUDENT_ADMIN_PASSWORD");
    if (!adminPw) return jr({ error: "ADMIN_PASSWORD not configured" }, 503);
    const { password, variant } = await req.json().catch(() => ({}));
    if (typeof password !== "string" || password.length === 0) {
      return jr({ error: "password required" }, 400);
    }
    // Tiny delay to slow brute force
    await new Promise((r) => setTimeout(r, 300));
    const submitted = password.trim();
    const isStudentVariant = variant === "student";
    const accepted =
      submitted === adminPw.trim() ||
      (isStudentVariant && studentPw ? submitted === studentPw.trim() : false);
    if (!accepted) return jr({ error: "Invalid password" }, 401);
    const token = await issueAdminToken();
    return jr({ token, expiresInSeconds: 8 * 60 * 60 });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
