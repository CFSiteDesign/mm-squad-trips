import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { BOOKING_NOT_SAVED_TEMPLATE, isDuplicateSave } from "./booking-save.ts";
import { bookingNotSavedOpsEmail } from "./email.ts";

Deno.test("booking save: only a duplicate of the same Stripe session counts as already saved", () => {
  const dup = 'duplicate key value violates unique constraint "bookings_stripe_session_id_spot_number_key"';
  assertEquals(isDuplicateSave({ code: "23505", message: dup }), true);
  assertEquals(isDuplicateSave({ message: dup }), true);
  assertEquals(isDuplicateSave({ code: "23514", message: "new row violates check constraint" }), false);
  assertEquals(isDuplicateSave({ code: "08006", message: "connection failure" }), false);
  assertEquals(isDuplicateSave(null), false);
  assertEquals(isDuplicateSave(undefined), false);
});

Deno.test("booking save: the ops alert names the guest, the trip and the Stripe session", () => {
  const { subject, html } = bookingNotSavedOpsEmail({
    guestName: "Holly <b>Craig</b>",
    guestEmail: "guest@example.com",
    tripName: "Vietnam Essentials",
    departureDate: "2027-02-17",
    spots: 2,
    paidToday: 0,
    cardSavedOnly: true,
    sessionId: "cs_live_test123",
    reason: "bookings insert: <i>x</i>",
  });
  assertEquals(subject, "ACTION NEEDED: ALL IN booking didn't save · Holly <b>Craig</b> · Vietnam Essentials");
  assertStringIncludes(html, "Holly &lt;b&gt;Craig&lt;/b&gt;");
  assertStringIncludes(html, "cs_live_test123");
  assertStringIncludes(html, "2027-02-17");
  assertStringIncludes(html, "$0.00 (card saved, balance charged later)");
  assertStringIncludes(html, "bookings insert: &lt;i&gt;x&lt;/i&gt;");
  assert(!html.includes("<i>x</i>"), "the error text is escaped");
  assert(!html.includes("—"), "no em dashes");
  assertEquals(BOOKING_NOT_SAVED_TEMPLATE, "booking_not_saved_ops");
});

Deno.test("booking save: a paid booking shows what was taken", () => {
  const { html } = bookingNotSavedOpsEmail({
    guestName: "A", guestEmail: "", tripName: "Laos Ultimate", departureDate: "", spots: 1,
    paidToday: 99, cardSavedOnly: false, sessionId: "cs_live_x", reason: "boom",
  });
  assertStringIncludes(html, "$99.00");
  assert(!html.includes("card saved"));
});
