import { assert, assertEquals } from "jsr:@std/assert@1";
import { previewAllowed, SALE_END_MS, SALE_START_MS, saleOffPerSpot } from "./black-friday.ts";
import { bookingConfirmedEmail } from "./email.ts";

Deno.test("the sale runs Friday 00:00 to Sunday 23:59 Bali time", () => {
  assertEquals(new Date(SALE_START_MS).toISOString(), "2026-11-26T16:00:00.000Z");
  assertEquals(new Date(SALE_END_MS).toISOString(), "2026-11-29T16:00:00.000Z");
  assertEquals(saleOffPerSpot("vietnam", SALE_START_MS - 1), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_START_MS), 200);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS - 1), 200);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS), 0);
});

Deno.test("$200 off the 10+ day trips, $100 off the 7-day trips, nothing on Thailand", () => {
  for (const slug of ["laos", "indonesia", "cambodia", "vietnam"]) assertEquals(saleOffPerSpot(slug, SALE_START_MS), 200, slug);
  for (const slug of ["vietnam-7", "indonesia-7"]) assertEquals(saleOffPerSpot(slug, SALE_START_MS), 100, slug);
  assertEquals(saleOffPerSpot("thailand", SALE_START_MS), 0);
  assertEquals(saleOffPerSpot("made-up", SALE_START_MS), 0);
});

Deno.test("a preview runs the sale early but never after it ends, and never for Thailand", () => {
  const early = SALE_START_MS - 86_400_000;
  assertEquals(saleOffPerSpot("vietnam", early), 0);
  assertEquals(saleOffPerSpot("vietnam", early, true), 200);
  assertEquals(saleOffPerSpot("thailand", early, true), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS, true), 0);
});

Deno.test("no preview without a key set, and only the exact key opens it", () => {
  assert(previewAllowed("abc", "abc"));
  assert(!previewAllowed("abd", "abc"));
  assert(!previewAllowed(undefined, undefined));
  assert(!previewAllowed("", ""));
  assert(!previewAllowed("abc", undefined));
});

Deno.test("the confirmation says nothing was charged only on a $0 deposit", () => {
  const base = { firstName: "Sam", tripCountry: "Vietnam", tripName: "ALL IN Vietnam", departureDate: "2027-02-01", spots: 1, balanceAmount: "$650.00 USD", balanceDueDate: "2027-01-25", payBalanceUrl: "https://example.com", bookingRef: "SOL-VNM-001", bookingUrl: "https://example.com", hasBalance: true };
  assert(bookingConfirmedEmail({ ...base, nothingChargedToday: true }).html.includes("Nothing has been charged today"));
  assert(!bookingConfirmedEmail(base).html.includes("Nothing has been charged today"));
});
