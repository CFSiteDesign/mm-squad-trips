// Saving a paid ALL IN checkout as a booking (stripe-webhook).
//
// 27 Nov 2026: a save that fails answers Stripe with a 500 so Stripe retries it,
// and the ops team gets one email per Stripe session about it.

/** email_send_log template name for the "booking didn't save" alert; also how we send it only once. */
export const BOOKING_NOT_SAVED_TEMPLATE = "booking_not_saved_ops";

/**
 * True when the bookings insert failed only because these rows already exist:
 * Stripe delivered the same event twice at once and the other delivery saved it
 * (unique stripe_session_id + spot_number, Postgres code 23505).
 */
export function isDuplicateSave(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  return /bookings_stripe_session_id_spot_number_key/.test(String(err.message ?? ""));
}
