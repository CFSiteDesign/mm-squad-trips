// Trip builder status page (#/trip/<ref>): GET ?ref=MM-XXXXXX (Charlie, 19 Oct 2026).
// Returns only what the guest's own page shows: no contact details. payLink is
// the deposit checkout while unpaid, and the balance checkout once the crew has
// sent it.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ref = (new URL(req.url).searchParams.get("ref") ?? "").trim().toUpperCase();
  if (!/^MM-[A-Z0-9]{6}$/.test(ref)) return json({ error: "Unknown trip" }, 404);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r, error } = await sb
    .from("trip_builder_requests")
    .select("ref,status,route,days,trip_link,crew_note,hold_until,deposit_amount,deposit_url,deposit_paid_at,refunded_at,balance_amount,balance_url,balance_paid_at")
    .eq("ref", ref)
    .maybeSingle();
  if (error) return json({ error: "Couldn't look that up" }, 500);
  if (!r) return json({ error: "Unknown trip" }, 404);
  const payLink = r.status === "pending_payment" ? r.deposit_url : r.status === "ready" ? r.balance_url : "";
  return json({
    ref: r.ref,
    status: r.status,
    route: r.route,
    days: r.days,
    link: r.trip_link,
    note: r.crew_note ?? "",
    payLink: payLink ?? "",
    hold: r.hold_until && (r.status === "submitted" || r.status === "checking") ? { until: r.hold_until } : null,
    deposit: { amount: Number(r.deposit_amount), paid: !!r.deposit_paid_at, refunded: !!r.refunded_at },
    balance: { amount: r.balance_amount != null ? Number(r.balance_amount) : null, paid: !!r.balance_paid_at },
  });
});
