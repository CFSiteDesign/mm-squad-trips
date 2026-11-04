// Admin CRUD over the five tables. Token-gated.
// POST body: { table, op, ...args }
//   op = "list" | "create" | "update" | "delete" | "cancel-booking"
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminToken, adminAuthHeaderToken } from "../_shared/admin-auth.ts";
import { cancelBookingValues } from "../_shared/booking-cancel.ts";
import { triggerCommissionPush } from "../_shared/push-commission.ts";

const TABLES = new Set([
  "trips",
  "departures",
  "pricing_calendar",
  "discount_codes",
  "bookings",
  "email_send_log",
]);
const READ_ONLY_TABLES = new Set(["bookings", "email_send_log"]);


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = adminAuthHeaderToken(req);
    if (!(await verifyAdminToken(token))) return jr({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return jr({ error: "Supabase not configured" }, 503);
    const sb = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { table, op } = body as { table?: string; op?: string };
    if (!table || !TABLES.has(table)) return jr({ error: "Invalid table" }, 400);

    if (op === "list") {
      const { orderBy = "created_at", ascending = false, limit = 500 } = body;
      const { data, error } = await sb
        .from(table)
        .select("*")
        .order(orderBy, { ascending: !!ascending })
        .limit(Math.min(2000, Number(limit) || 500));
      if (error) return jr({ error: error.message }, 400);
      return jr({ rows: data });
    }

    if (op === "create") {
      if (READ_ONLY_TABLES.has(table)) return jr({ error: `${table} is read-only` }, 400);
      const { values } = body;

      if (!values || typeof values !== "object") return jr({ error: "values required" }, 400);
      const { data, error } = await sb.from(table).insert(values).select().single();
      if (error) return jr({ error: error.message }, 400);
      return jr({ row: data });
    }

    if (op === "update") {
      if (READ_ONLY_TABLES.has(table)) return jr({ error: `${table} is read-only` }, 400);
      const { id, values } = body;
      if (!id) return jr({ error: "id required" }, 400);
      if (!values || typeof values !== "object") return jr({ error: "values required" }, 400);
      const { data, error } = await sb.from(table).update(values).eq("id", id).select().single();
      if (error) return jr({ error: error.message }, 400);
      return jr({ row: data });
    }

    if (op === "delete") {
      if (READ_ONLY_TABLES.has(table)) return jr({ error: `${table} is read-only` }, 400);
      const { id } = body;
      if (!id) return jr({ error: "id required" }, 400);
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return jr({ error: error.message }, 400);
      return jr({ ok: true });
    }

    // Bookings stay read-only otherwise. Every row of the booking goes together, whichever row was opened.
    if (op === "cancel-booking") {
      if (table !== "bookings") return jr({ error: "Only bookings can be cancelled" }, 400);
      const { id } = body;
      if (!id) return jr({ error: "id required" }, 400);
      const { data: row, error: readErr } = await sb.from("bookings").select("stripe_session_id,balance_status").eq("id", id).maybeSingle();
      if (readErr) return jr({ error: readErr.message }, 400);
      if (!row) return jr({ error: "Booking not found" }, 404);
      const match = sb.from("bookings").update(cancelBookingValues(row.balance_status));
      const { data: done, error } = await (row.stripe_session_id ? match.eq("stripe_session_id", row.stripe_session_id) : match.eq("id", id)).select("id");
      if (error) return jr({ error: error.message }, 400);
      await triggerCommissionPush(sb);
      return jr({ ok: true, spots: done?.length ?? 0 });
    }

    return jr({ error: "Unknown op" }, 400);
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
