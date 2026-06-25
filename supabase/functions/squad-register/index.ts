// Register a new Squad Leader and generate their unique code.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { APP_URL, sendEmail, squadCreatedEmail } from "../_shared/email.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(10000 + (buf[0] % 90000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jr({ error: "Backend not configured" }, 503);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jr({ error: "Invalid JSON" }, 400);
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const isStudent = body.is_student === true;
  const university = str(body.university);
  const society = str(body.society);

  if (!name || !email || !phone) return jr({ error: "Name, email and phone are required" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jr({ error: "Invalid email" }, 400);
  if (isStudent && !university) return jr({ error: "University is required for student applications" }, 400);

  const supabase = createClient(url, key);

  // Existing email → resend dashboard link (only if approved); else just say pending.
  const { data: existing } = await supabase
    .from("squad_leaders")
    .select("name, code, access_token, status, is_student")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    if (existing.status === "pending") {
      return jr({ returning: true, pending: true });
    }
    const { subject, html } = squadCreatedEmail({
      leaderName: (existing.name ?? "").split(" ")[0] || existing.name || "there",
      squadName: `${existing.name ?? "your"}'s squad`,
      squadCode: existing.code,
      dashboardUrl: `${APP_URL}/squad-leader/dashboard?token=${encodeURIComponent(existing.access_token)}`,
    });
    sendEmail({ to: email, subject, html }).catch((e) => console.warn("squad-created resend failed", e));
    return jr({ returning: true });
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("squad_leaders")
      .insert({
        name,
        email,
        phone,
        instagram: str(body.instagram) || null,
        preferred_trip_slug: str(body.preferred_trip_slug) || null,
        preferred_month: str(body.preferred_month) || null,
        reason: str(body.reason) || null,
        code,
        is_student: isStudent,
        status: isStudent ? "pending" : "approved",
        university: university || null,
        society: society || null,
      })
      .select("code, access_token, status")
      .single();
    if (!error && data) {
      if (data.status === "approved") {
        const { subject, html } = squadCreatedEmail({
          leaderName: name.split(" ")[0] || name,
          squadName: `${name}'s squad`,
          squadCode: data.code,
          dashboardUrl: `${APP_URL}/squad-leader/dashboard?token=${encodeURIComponent(data.access_token)}`,
        });
        sendEmail({ to: email, subject, html }).catch((e) => console.warn("squad-created email failed", e));
        return jr({ code: data.code, accessToken: data.access_token, returning: false });
      }
      // Pending student — don't reveal code/token; Hayley approves first.
      return jr({ returning: false, pending: true });
    }
    if (error && !`${error.message}`.toLowerCase().includes("squad_leaders_code_key")) {
      console.error("squad-register insert failed", error);
      return jr({ error: error.message }, 500);
    }
  }
  return jr({ error: "Could not generate a unique code, please try again" }, 500);
});
