import { assert, assertEquals } from "jsr:@std/assert@1";
import { isUniTripKind, relayPayload, returnUrl, safeEqual, validPence } from "./uni-trip.ts";

Deno.test("only uni trip sessions take the uni branch", () => {
  for (const k of ["uni_trip_deposit", "uni_trip_instalments", "uni_trip_extra"]) assert(isUniTripKind(k));
  for (const k of ["balance", "trip_builder_deposit", "", undefined, null, "uni_tripdeposit"]) assert(!isUniTripKind(k));
});

Deno.test("the shared key must match exactly", () => {
  assert(safeEqual("abc123", "abc123"));
  assert(!safeEqual("abc123", "abc124"));
  assert(!safeEqual("", ""));
  assert(!safeEqual("abc", "abc123"));
});

Deno.test("amounts are whole pence between 50p and £5,000", () => {
  assertEquals(validPence(5000), 5000);
  assertEquals(validPence(49), null);
  assertEquals(validPence(500_001), null);
  assertEquals(validPence(50.5), null);
  assertEquals(validPence("5000"), null);
});

Deno.test("Stripe only sends students back to https pages or localhost", () => {
  assertEquals(returnUrl("https://all-in-concierge.lovable.app/trip/exeter/booked?b=1&paid=1"), "https://all-in-concierge.lovable.app/trip/exeter/booked?b=1&paid=1");
  assertEquals(returnUrl("http://localhost:5188/trip/exeter"), "http://localhost:5188/trip/exeter");
  assertEquals(returnUrl("http://evil.example/trip"), null);
  assertEquals(returnUrl("javascript:alert(1)"), null);
  assertEquals(returnUrl(42), null);
});

Deno.test("UNI Advisors hears the booking, the payments and the saved card", () => {
  const p = relayPayload({
    id: "cs_test_1",
    amount_total: 5000,
    customer: "cus_abc123",
    payment_intent: { id: "pi_abc123" } as never,
    metadata: { kind: "uni_trip_deposit", uni_booking_id: "4b0c7c1e-2d9a-4f3e-9b1a-0c8d7e6f5a4b", uni_slug: "exeter", amount_pence: "5000" },
  }, "pm_abc123");
  assertEquals(p, {
    event: "checkout.session.completed",
    purpose: "deposit",
    booking_id: "4b0c7c1e-2d9a-4f3e-9b1a-0c8d7e6f5a4b",
    payment_ids: "",
    mode: "",
    amount_pence: 5000,
    session_id: "cs_test_1",
    customer_id: "cus_abc123",
    payment_intent_id: "pi_abc123",
    payment_method_id: "pm_abc123",
  });
  const due = relayPayload({ id: "cs_2", amount_total: 2092, customer: null, payment_intent: null, metadata: { kind: "uni_trip_instalments", uni_booking_id: "x", payment_ids: "a,b" } }, null);
  assertEquals([due.purpose, due.payment_ids, due.amount_pence], ["instalments", "a,b", 2092]);
});
