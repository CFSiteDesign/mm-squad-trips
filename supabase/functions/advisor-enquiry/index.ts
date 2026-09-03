// "Talk to an advisor": store the enquiry and tell ops, so the page's promise
// that "an advisor will get back to you" has someone on the other end.
//
// The trip pages replaced custom dates with this. Inserts go through here
// rather than straight from the browser so an email leaves at the same time
// as the row lands; the table's anon insert policy remains as a fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { OPS_NOTIFY_EMAILS, sendEmail } from "../_shared/email.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

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
  const method = str(body.method).toLowerCase();
  const value = str(body.value).slice(0, 200);
  const tripSlug = str(body.tripSlug).slice(0, 60) || null;
  const tripName = str(body.tripName).slice(0, 120) || null;
  const source = str(body.source).slice(0, 40) || "site";

  if (method !== "whatsapp" && method !== "email") return jr({ error: "Pick WhatsApp or email" }, 400);
  if (!value) return jr({ error: method === "email" ? "Add your email" : "Add your WhatsApp number" }, 400);
  if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return jr({ error: "That email doesn't look right" }, 400);
  if (method === "whatsapp" && !/^\+?[\d\s()-]{7,}$/.test(value)) return jr({ error: "That number doesn't look right" }, 400);

  const sb = createClient(url, key);
  const { data: row, error } = await sb
    .from("advisor_enquiries")
    .insert({ trip_slug: tripSlug, trip_name: tripName, contact_method: method, contact_value: value, source })
    .select("id, created_at")
    .single();
  if (error) return jr({ error: error.message }, 500);

  // Ops get the lead straight away. A failed email must not fail the enquiry:
  // the row is already saved and the visitor has been told it's in hand.
  const via = method === "whatsapp" ? "WhatsApp" : "Email";
  const html = `
<div style="font-family:Montserrat,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0a0a0a">
<h2 style="margin:0 0 12px 0;font-size:20px;text-transform:uppercase">New advisor enquiry</h2>
<p style="margin:0 0 8px 0">Someone on the ALL IN site asked to talk to an advisor.</p>
<table style="border-collapse:collapse">
<tr><td style="padding:6px 12px 6px 0"><strong>Trip</strong></td><td style="padding:6px 0">${esc(tripName ?? tripSlug ?? "Not specified")}</td></tr>
<tr><td style="padding:6px 12px 6px 0"><strong>${via}</strong></td><td style="padding:6px 0">${esc(value)}</td></tr>
<tr><td style="padding:6px 12px 6px 0"><strong>Received</strong></td><td style="padding:6px 0">${esc(String(row.created_at))}</td></tr>
</table>
<p style="margin:12px 0 0 0;font-size:13px;color:#555">Reference ${esc(String(row.id))} · advisor_enquiries</p>
</div>`;
  sendEmail({
    to: OPS_NOTIFY_EMAILS,
    subject: `Advisor enquiry · ${tripName ?? tripSlug ?? "ALL IN"} · ${via}`,
    html,
    templateName: "advisor_enquiry",
    metadata: { enquiry_id: row.id, trip_slug: tripSlug, method },
  }).catch((e) => console.warn("advisor enquiry email failed", e instanceof Error ? e.message : e));

  return jr({ ok: true, id: row.id });
});
