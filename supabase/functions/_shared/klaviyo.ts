// Klaviyo client + the outbox writer. Server-side only; the private key is
// the KLAVIYO_PRIVATE_KEY secret in Lovable Cloud.
//
// Everything Klaviyo-facing goes through klaviyo-sync, which reads
// app_config('klaviyo_mode') before it sends anything. The lifecycle
// functions only ever call enqueueKlaviyo(), which appends a row and can
// never throw into the booking flow.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://a.klaviyo.com/api";
// Klaviyo versions its API by date. Bump deliberately; log it in
// docs/klaviyo/BUILD_LOG.md if a bump changes behaviour.
export const KLAVIYO_REVISION = "2025-07-15";

export type OutboxEvent =
  | "booking_placed"
  | "departure_confirmed"
  | "balance_paid"
  | "balance_failed"
  | "departure_cancelled"
  | "profile_sync";

/** Metric names Mich builds flows on. Renaming breaks her flows. */
export const METRIC_NAMES: Record<Exclude<OutboxEvent, "profile_sync">, string> = {
  booking_placed: "ALL IN Booking Placed",
  departure_confirmed: "ALL IN Departure Confirmed",
  balance_paid: "ALL IN Balance Paid",
  balance_failed: "ALL IN Balance Failed",
  departure_cancelled: "ALL IN Departure Cancelled",
};

/**
 * Append a lifecycle moment for klaviyo-sync to pick up. Never throws: a
 * Klaviyo problem must not become a booking problem.
 */
export async function enqueueKlaviyo(
  sb: SupabaseClient,
  bookingSession: string,
  event: OutboxEvent,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await sb.from("klaviyo_outbox").insert({ booking_session: bookingSession, event, payload });
    if (error) console.warn(`klaviyo outbox insert failed (${event}, ${bookingSession}):`, error.message);
  } catch (e) {
    console.warn(`klaviyo outbox insert threw (${event}, ${bookingSession}):`, e instanceof Error ? e.message : e);
  }
}

function apiKey(): string {
  const k = Deno.env.get("KLAVIYO_PRIVATE_KEY")?.trim();
  if (!k) throw new Error("KLAVIYO_PRIVATE_KEY is not set");
  return k;
}

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey()}`,
      revision: KLAVIYO_REVISION,
      accept: "application/vnd.api+json",
      ...(body ? { "content-type": "application/vnd.api+json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Klaviyo ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

export type KlaviyoProfile = {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  properties: Record<string, unknown>;
};

const E164 = /^\+[1-9]\d{7,14}$/;

/** Create-or-update by email. Returns the Klaviyo profile id. */
export async function upsertProfile(p: KlaviyoProfile): Promise<string> {
  const attributes: Record<string, unknown> = { email: p.email, properties: p.properties };
  if (p.firstName) attributes.first_name = p.firstName;
  if (p.lastName) attributes.last_name = p.lastName;
  // Klaviyo rejects the whole profile on a bad phone number, so only send
  // clean E.164 and keep the raw value on a property.
  if (p.phone && E164.test(p.phone)) attributes.phone_number = p.phone;
  const res = (await call("POST", "/profile-import/", { data: { type: "profile", attributes } })) as { data?: { id?: string } };
  const id = res?.data?.id;
  if (!id) throw new Error("Klaviyo profile import returned no id");
  return id;
}

/** Add to a list without recording marketing consent (transactional use). */
export async function addToList(listId: string, profileId: string): Promise<void> {
  await call("POST", `/lists/${listId}/relationships/profiles/`, { data: [{ type: "profile", id: profileId }] });
}

export async function trackEvent(v: {
  metric: string;
  email: string;
  properties: Record<string, unknown>;
  value?: number;
  uniqueId: string;
  time?: string;
}): Promise<void> {
  await call("POST", "/events/", {
    data: {
      type: "event",
      attributes: {
        properties: v.properties,
        time: v.time ?? new Date().toISOString(),
        ...(v.value !== undefined ? { value: v.value } : {}),
        unique_id: v.uniqueId,
        metric: { data: { type: "metric", attributes: { name: v.metric } } },
        profile: { data: { type: "profile", attributes: { email: v.email } } },
      },
    },
  });
}

export async function listLists(): Promise<Array<{ id: string; name: string }>> {
  const out: Array<{ id: string; name: string }> = [];
  let path: string | null = "/lists/?fields[list]=name";
  while (path) {
    const res = (await call("GET", path)) as { data?: Array<{ id: string; attributes?: { name?: string } }>; links?: { next?: string | null } };
    for (const l of res?.data ?? []) out.push({ id: l.id, name: l.attributes?.name ?? "" });
    const next = res?.links?.next ?? null;
    path = next ? next.replace(BASE, "") : null;
  }
  return out;
}
