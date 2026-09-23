// Admin-only: push a fake booker to Klaviyo without creating a booking or
// charging Stripe. Same helper the webhook uses after a real payment.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminAuthHeaderToken, verifyAdminToken } from "../_shared/admin-auth.ts";
import { syncBookerToKlaviyo } from "../_shared/klaviyo.ts";

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await verifyAdminToken(adminAuthHeaderToken(req)))) {
    return jr({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "Klaviyo Test").trim() || "Klaviyo Test";
  const phone = body.phone ? String(body.phone).trim() : "";
  const country = body.country ? String(body.country).trim() : "United Kingdom";
  const tripSlug = String(body.tripSlug ?? "indonesia").trim() || "indonesia";
  const tripName = String(body.tripName ?? "Indonesia").trim() || "Indonesia";
  const departureDate = String(body.departureDate ?? "2026-09-22").trim() || "2026-09-22";

  if (!email || !email.includes("@")) return jr({ error: "email required" }, 400);

  const firstName = name.split(" ")[0] || "Test";
  const lastName = name.split(" ").slice(1).join(" ");
  const result = await syncBookerToKlaviyo({
    email,
    firstName,
    lastName: lastName || undefined,
    phone: phone || null,
    country,
    tripSlug,
    tripName,
    departureDate,
    bookingRef: `TEST-${Date.now().toString(36).toUpperCase()}`,
    status: "deposit",
    spots: 1,
    paymentType: "Deposit",
    amountPaid: 99,
    fullDue: 700,
    balanceDue: 601,
    currency: "usd",
    travellerMode: "independent",
    solo: true,
    uniqueId: `test-klaviyo-${email}-${Date.now()}`,
  });

  if (result.skipped) return jr({ error: result.skipped, ...result }, 503);
  if (!result.ok) return jr({ error: result.errors.join("; ") || "Klaviyo sync failed", ...result }, 502);
  return jr({
    ok: true,
    email: result.email,
    departureLabel: result.departureLabel,
    phone: result.phone,
    listId: Deno.env.get("KLAVIYO_LIST_ID")?.trim() || "RsVDpj",
    metric: "Booked ALL IN Trip",
  });
});
