// Register a new Squad Leader and generate their unique code.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous base32
  let s = "";
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  for (const b of buf) s += alphabet[b % alphabet.length];
  return `SQUAD-${s}`;
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

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  if (!name || !email || !phone) return jr({ error: "Name, email and phone are required" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jr({ error: "Invalid email" }, 400);

  const supabase = createClient(url, key);

  // If they've already registered with this email, return their existing code/token
  // so they don't get a duplicate-error wall.
  const { data: existing } = await supabase
    .from("squad_leaders")
    .select("code, access_token")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return jr({ code: existing.code, accessToken: existing.access_token, returning: true });
  }

  // Try a handful of times in case of unique-violation on code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("squad_leaders")
      .insert({
        name,
        email,
        phone,
        instagram: body.instagram?.trim() || null,
        preferred_trip_slug: body.preferred_trip_slug?.trim() || null,
        preferred_month: body.preferred_month?.trim() || null,
        reason: body.reason?.trim() || null,
        code,
      })
      .select("code, access_token")
      .single();
    if (!error && data) {
      return jr({ code: data.code, accessToken: data.access_token, returning: false });
    }
    // Unique violation on code → retry; other errors → surface
    if (error && !`${error.message}`.toLowerCase().includes("squad_leaders_code_key")) {
      console.error("squad-register insert failed", error);
      return jr({ error: error.message }, 500);
    }
  }
  return jr({ error: "Could not generate a unique code, please try again" }, 500);
});
