// Trip builder status page (#/trip/<ref>): GET ?ref=MM-XXXXXX[&k=<guest key>] (Charlie, 19 Oct 2026; payments Ewan, 20 Oct 2026).
// Returns only what the guest's own page shows: no contact details. With the guest key from their "your trip is checked"
// email it also returns how they can pay the rest, and their payment schedule once they are booked.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyGuestKey } from "../_shared/trip-builder-crew.ts";
import { daysUntil, isoDay, payOptions, readSchedule } from "../_shared/trip-builder-pay.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const q = new URL(req.url).searchParams;
  const ref = (q.get("ref") ?? "").trim().toUpperCase();
  if (!/^MM-[A-Z0-9]{6}$/.test(ref)) return json({ error: "Unknown trip" }, 404);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r, error } = await sb
    .from("trip_builder_requests")
    .select("ref,status,route,days,start_date,trip_link,crew_note,hold_until,deposit_amount,deposit_url,deposit_paid_at,refunded_at,balance_amount,balance_paid_at,stripe_payment_method_id,pay_plan,pay_schedule")
    .eq("ref", ref)
    .maybeSingle();
  if (error) return json({ error: "Couldn't look that up" }, 500);
  if (!r) return json({ error: "Unknown trip" }, 404);
  const keyed = await verifyGuestKey(ref, q.get("k"));
  const payLink = r.status === "pending_payment" ? r.deposit_url : "";
  const items = readSchedule(r.pay_schedule), today = isoDay(new Date());
  const balance = r.balance_amount != null ? Number(r.balance_amount) : null;
  return json({
    ref: r.ref,
    status: r.status,
    route: r.route,
    days: r.days,
    start: r.start_date,
    link: r.trip_link,
    note: r.crew_note ?? "",
    payLink: payLink ?? "",
    hold: r.hold_until && (r.status === "submitted" || r.status === "checking") ? { until: r.hold_until } : null,
    deposit: { amount: Number(r.deposit_amount), paid: !!r.deposit_paid_at, refunded: !!r.refunded_at },
    balance: { amount: balance, paid: !!r.balance_paid_at },
    keyed,
    // How they can pay the rest, once the crew has checked the trip (needs their key).
    pay: keyed && r.status === "ready" && balance != null
      ? { balance, daysToGo: daysUntil(r.start_date), options: payOptions({ balance, start: r.start_date, cardSaved: !!r.stripe_payment_method_id }) }
      : null,
    // Their payments once they are booked, and anything overdue they can pay by hand (needs their key).
    plan: keyed ? r.pay_plan : null,
    schedule: keyed ? items.map((i) => ({ n: i.n, amount: i.amount, due: i.due, status: i.status })) : [],
    owing: keyed ? items.filter((i) => i.how === "card" && (i.status === "failed" || (i.status === "pending" && i.due <= today))).map((i) => ({ n: i.n, amount: i.amount, due: i.due })) : [],
  });
});
