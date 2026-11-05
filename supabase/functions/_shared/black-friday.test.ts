import { assert, assertEquals } from "jsr:@std/assert@1";
import { EARLY_ACCESS_START_MS, SALE_END_MS, SALE_START_MS, saleAccessFor, saleOffPerSpot } from "./black-friday.ts";
import { balanceHeadsUpEmail, bookingConfirmedEmail } from "./email.ts";
import { headsUpDue } from "./balance-heads-up.ts";
import { financeBreakdown } from "./finance-breakdown.ts";

Deno.test("the sale runs Friday 00:00 to Sunday 23:59 Bali time", () => {
  assertEquals(new Date(SALE_START_MS).toISOString(), "2026-11-26T16:00:00.000Z");
  assertEquals(new Date(SALE_END_MS).toISOString(), "2026-11-29T16:00:00.000Z");
  assertEquals(saleOffPerSpot("vietnam", SALE_START_MS - 1), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_START_MS), 200);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS - 1), 200);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS), 0);
});

Deno.test("$200 off trips over $500, $100 off $500 or less, nothing on Thailand", () => {
  for (const slug of ["indonesia", "cambodia", "vietnam"]) assertEquals(saleOffPerSpot(slug, SALE_START_MS), 200, slug);
  for (const slug of ["laos", "vietnam-7", "indonesia-7"]) assertEquals(saleOffPerSpot(slug, SALE_START_MS), 100, slug);
  assertEquals(saleOffPerSpot("thailand", SALE_START_MS), 0);
  assertEquals(saleOffPerSpot("made-up", SALE_START_MS), 0);
});

Deno.test("early access opens Thursday 12:00 Bali time, only with the link", () => {
  assertEquals(new Date(EARLY_ACCESS_START_MS).toISOString(), "2026-11-26T04:00:00.000Z");
  assertEquals(saleOffPerSpot("vietnam", EARLY_ACCESS_START_MS - 1, "early"), 0);
  assertEquals(saleOffPerSpot("vietnam", EARLY_ACCESS_START_MS, "early"), 200);
  assertEquals(saleOffPerSpot("vietnam", EARLY_ACCESS_START_MS), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_START_MS - 1), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS, "early"), 0);
});

Deno.test("the test link runs the sale early but never after it ends, and never for Thailand", () => {
  const early = SALE_START_MS - 30 * 86_400_000;
  assertEquals(saleOffPerSpot("vietnam", early, "preview"), 200);
  assertEquals(saleOffPerSpot("thailand", early, "preview"), 0);
  assertEquals(saleOffPerSpot("vietnam", SALE_END_MS, "preview"), 0);
});

Deno.test("departures before 30 Nov aren't in the sale, whichever way you came in", () => {
  for (const access of [null, "early", "preview"] as const) {
    assertEquals(saleOffPerSpot("vietnam", SALE_START_MS, access, "2026-11-29"), 0);
    assertEquals(saleOffPerSpot("vietnam", SALE_START_MS, access, "2026-11-30"), 200);
  }
});

Deno.test("a key only opens anything when its hash matches", async () => {
  const hashes = { "62af8704764faf8ea82fc61ce9c4c3908b6cb97d463a634e9e587d7c885db0ef": "early" as const };
  assertEquals(await saleAccessFor("test-key", hashes), "early");
  assertEquals(await saleAccessFor("test-kez", hashes), null);
  for (const bad of ["", null, undefined, 12, "constructor", "x".repeat(101)]) assertEquals(await saleAccessFor(bad, hashes), null);
  assertEquals(await saleAccessFor("test-key"), null);
});

Deno.test("finance sees the original price, each discount and the final price on the charge", () => {
  // T&Cs example: $750, $200 off, then a 10% creator code.
  assertEquals(
    financeBreakdown({ original_price: "750", sale: "black_friday", sale_off: "200", code_off: "55", discount_amount: "255", final_price: "495", discount_code: "ABC", creator_code: "ABC", lead_email: "x@y.z" }),
    { original_price: "750", sale: "black_friday", sale_off: "200", code_off: "55", final_price: "495", discount_code: "ABC", creator_code: "ABC" },
  );
});

Deno.test("a booking from before the sale still gets a breakdown, and one with no session gets none", () => {
  assertEquals(
    financeBreakdown({ original_price: "850", sale: "", sale_off: "", discount_amount: "100", final_price: "750", discount_code: "OLD" }),
    { original_price: "850", sale_off: "0", code_off: "100", final_price: "750", discount_code: "OLD" },
  );
  assertEquals(financeBreakdown({}), {});
  assertEquals(financeBreakdown(null), {});
});

const CHARGE = "2026-12-23T14:00:00.000Z";
const at = (iso: string) => Date.parse(iso);
const row = { balance_next_attempt_at: CHARGE, created_at: "2026-11-27T02:00:00.000Z", balance_amount: 650, group_size: 1 };

Deno.test("the heads-up goes 3 days before the charge, and a missed run still sends", () => {
  assert(!headsUpDue(row, at("2026-12-19T14:00:05.000Z")));
  assert(headsUpDue(row, at("2026-12-20T14:00:05.000Z")));
  assert(headsUpDue(row, at("2026-12-22T14:00:05.000Z")));
  assert(!headsUpDue(row, at("2026-12-23T04:00:00.000Z")));
  assert(!headsUpDue(row, at("2026-12-23T14:00:05.000Z")));
});

Deno.test("no heads-up for someone who has only just booked, or owes nothing", () => {
  assert(!headsUpDue({ ...row, created_at: "2026-12-20T13:00:00.000Z" }, at("2026-12-20T14:00:05.000Z")));
  assert(!headsUpDue({ ...row, balance_amount: 0 }, at("2026-12-20T14:00:05.000Z")));
  assert(!headsUpDue({ ...row, balance_next_attempt_at: null }, at("2026-12-20T14:00:05.000Z")));
});

Deno.test("the heads-up only promises a free cancel on a $0 deposit booking", () => {
  const base = { firstName: "Sam", tripName: "14-day Vietnam", departureDate: "Dec 30, 2026", chargeDate: "Dec 23, 2026", amount: "$650.00 USD", bookingRef: "SOL-VNM-001", payBalanceUrl: "https://example.com" };
  const free = balanceHeadsUpEmail({ ...base, nothingPaidYet: true });
  assert(free.html.includes("$650.00 USD"));
  assert(free.html.includes("Dec 23, 2026"));
  assert(free.html.includes("you owe nothing"));
  assert(free.html.includes("cs@madmonkeyhostels.com"));
  assert(!balanceHeadsUpEmail({ ...base, nothingPaidYet: false }).html.includes("you owe nothing"));
});

Deno.test("the confirmation says nothing was charged only on a $0 deposit", () => {
  const base = { firstName: "Sam", tripCountry: "Vietnam", tripName: "ALL IN Vietnam", departureDate: "2027-02-01", spots: 1, balanceAmount: "$650.00 USD", balanceDueDate: "2027-01-25", payBalanceUrl: "https://example.com", bookingRef: "SOL-VNM-001", bookingUrl: "https://example.com", hasBalance: true };
  assert(bookingConfirmedEmail({ ...base, nothingChargedToday: true }).html.includes("Nothing has been charged today"));
  assert(!bookingConfirmedEmail(base).html.includes("Nothing has been charged today"));
});
