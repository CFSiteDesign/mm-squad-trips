import { assert, assertEquals } from "jsr:@std/assert@1";
import { addDays, allPaid, buildSchedule, daysUntil, dueNow, instalmentCount, laterDepositTotal, needReminder, parseLaterDeposit, paymentFits, payOptions, readSchedule, splitCents } from "./trip-builder-pay.ts";

const NOW = new Date("2026-10-20T10:00:00Z");
const plus = (n: number) => addDays("2026-10-20", n);
const sum = (xs: { amount: number }[]) => Math.round(xs.reduce((a, x) => a + x.amount * 100, 0));

Deno.test("days until departure counts whole UTC days", () => {
  assertEquals(daysUntil("2026-10-20", NOW), 0);
  assertEquals(daysUntil("2026-12-19", NOW), 60);
  assertEquals(daysUntil("2026-10-10", NOW), -10);
  assertEquals(daysUntil(null, NOW), null);
  assertEquals(daysUntil("nonsense", NOW), null);
});

Deno.test("splitting a balance never loses or invents a cent", () => {
  for (const [total, n] of [[60000, 2], [60001, 3], [99999, 6], [2000, 2], [1, 1]]) {
    const parts = splitCents(total, n);
    assertEquals(parts.length, n);
    assertEquals(parts.reduce((a, b) => a + b, 0), total);
  }
  assertEquals(splitCents(10001, 3), [3333, 3333, 3335]);
});

Deno.test("instalments need 60+ days, one every 30 days, the last 7+ days before departure", () => {
  assertEquals(instalmentCount(59, 600), 0, "59 days is too close");
  assertEquals(instalmentCount(60, 600), 2);
  assertEquals(instalmentCount(120, 600), 4);
  assertEquals(instalmentCount(400, 600), 6, "capped at six");
  assertEquals(instalmentCount(null, 600), 0, "no date, no instalments");
  assertEquals(instalmentCount(120, 59), 2, "$59 still fits two of $20 or more");
  assertEquals(instalmentCount(120, 39), 0, "$39 can't make two payments of $20");
});

Deno.test("'later' charges the card 7 days before departure", () => {
  const s = buildSchedule("later", 450, plus(40), NOW);
  assertEquals(s.length, 1);
  assertEquals(s[0].due, plus(33));
  assertEquals(s[0].how, "card");
  assertEquals(s[0].amount, 450);
});

Deno.test("'later' with a deposit: the deposit today through Checkout, the rest on the card 7 days before departure", () => {
  const s = buildSchedule("later", 927, plus(40), NOW, 99);
  assertEquals(s.map((i) => [i.n, i.amount, i.due, i.how]), [[1, 99, "2026-10-20", "checkout"], [2, 828, plus(33), "card"]]);
  assertEquals(sum(s), 92700, "the two payments add up to the price");
  assertEquals(sum(buildSchedule("later", 150.55, plus(40), NOW, 99)), 15055, "cents survive");
  assertEquals(dueNow(s, NOW).length, 0, "the deposit is never charged by the daily job");
  assertEquals(dueNow(s, new Date(`${plus(33)}T10:00:00Z`)).map((i) => i.n), [2], "the rest is, on the day");
  assertEquals(needReminder(s, 3, new Date(`${plus(30)}T10:00:00Z`)).map((i) => i.n), [2], "with the same reminder");
});

Deno.test("'later' isn't offered at or under the deposit, and a deposit paid when the trip was sent means one item", () => {
  const later = (balance: number, laterDeposit: number) => payOptions({ balance, start: plus(30), now: NOW, laterDeposit }).find((o) => o.plan === "later");
  assertEquals(later(99, 99), undefined, "exactly the deposit");
  assertEquals(later(50, 99), undefined, "under it");
  assertEquals(later(99.5, 99), undefined, "less than $1 left");
  assertEquals(later(100, 99)?.items.map((i) => i.amount), [99, 1], "$1 left is enough");
  assertEquals(later(150, 99)?.items.map((i) => i.amount), [99, 51]);
  assertEquals(later(198, 198), undefined, "two people, $99 each");
  assertEquals(later(500, 198)?.items.map((i) => i.amount), [198, 302]);
  assertEquals(payOptions({ balance: 99, start: plus(30), now: NOW, laterDeposit: 99 }).map((o) => o.plan), ["now"], "'now' is still there");
  assertEquals(laterDepositTotal(99, { party_size: 1 }), 99);
  assertEquals(laterDepositTotal(99, { party_size: 3 }), 297, "per person");
  assertEquals(laterDepositTotal(99, { party_size: 3, deposit_paid_at: "2026-10-01T00:00:00Z" }), 0, "already paid one when they sent it");
  const paidWhenSent = later(500, 0)!;
  assertEquals(paidWhenSent.count, 1);
  assertEquals(buildSchedule("later", 500, plus(30), NOW, 0).map((i) => [i.amount, i.how]), [[500, "card"]]);
  assertEquals(payOptions({ balance: 500, start: plus(120), now: NOW, laterDeposit: 99 }).find((o) => o.plan === "instalments")?.items[0].amount, payOptions({ balance: 500, start: plus(120), now: NOW }).find((o) => o.plan === "instalments")?.items[0].amount, "instalments don't change");
});

Deno.test("a payment page left open while the plan changed is never counted as the payment", () => {
  const later = buildSchedule("later", 927, plus(40), NOW, 99), now = buildSchedule("now", 927, plus(40), NOW);
  assert(paymentFits("trip_builder_instalment", later[0], 99, 927), "the deposit, as scheduled");
  assert(!paymentFits("trip_builder_instalment", now[0], 99, 927), "a $99 tab paid after they switched to 'pay it all now': not paid in full");
  assert(!paymentFits("trip_builder_instalment", undefined, 99, 927), "a $99 tab paid after the schedule was reset");
  assert(paymentFits("trip_builder_balance", now[0], 927, 927), "pay it all now");
  assert(paymentFits("trip_builder_balance", undefined, 927, 927), "an old whole-balance payment with no schedule");
  assert(!paymentFits("trip_builder_balance", undefined, 927, 1000), "the crew changed the price");
});

Deno.test("the deposit secret: unset or a typo is $99, 0 is off", () => {
  for (const v of [undefined, null, "", "  ", "abc", "$50", "-5", "1001", "12.5"]) assertEquals(parseLaterDeposit(v), 99, String(v));
  assertEquals(parseLaterDeposit("0"), 0);
  assertEquals(parseLaterDeposit(" 150 "), 150);
});

Deno.test("'now' is one payment today through Checkout", () => {
  const s = buildSchedule("now", 450, plus(40), NOW);
  assertEquals([s.length, s[0].due, s[0].how], [1, "2026-10-20", "checkout"]);
});

Deno.test("instalments: first now through Checkout, the rest on the card every 30 days, all before the last-week cut-off", () => {
  for (const days of [60, 75, 97, 150, 400]) {
    const s = buildSchedule("instalments", 601, plus(days), NOW);
    assert(s.length >= 2 && s.length <= 6);
    assertEquals(sum(s), 60100, `parts add up (${days} days out)`);
    assertEquals([s[0].how, s[0].due], ["checkout", "2026-10-20"]);
    assert(s.slice(1).every((i, k) => i.how === "card" && i.due === plus(30 * (k + 1))));
    assert(s[s.length - 1].due <= addDays(plus(days), -7), `last payment is at least 7 days before departure (${days} days out)`);
  }
});

Deno.test("options: now always; later and instalments only with enough time before departure", () => {
  const plans = (o: Parameters<typeof payOptions>[0]) => payOptions({ ...o, now: NOW }).map((x) => x.plan);
  assertEquals(plans({ balance: 500, start: plus(120) }), ["now", "later", "instalments"], "free to send: no card on file yet, it is collected when they choose");
  assertEquals(plans({ balance: 500, start: plus(30) }), ["now", "later"], "30 days out: no instalments");
  assertEquals(plans({ balance: 500, start: plus(7) }), ["now"], "leaving in a week: the 7-day charge date is already here");
  assertEquals(plans({ balance: 500, start: plus(8) }), ["now", "later"], "8 days out: charge tomorrow");
  assertEquals(plans({ balance: 500, start: null }), ["now"], "no date: nothing to schedule against");
  assertEquals(plans({ balance: 0.5, start: plus(120) }), [], "nothing to pay");
});

Deno.test("what is due today, and what needs a reminder", () => {
  const s = buildSchedule("instalments", 600, plus(120), NOW);
  s[0].status = "paid";
  assertEquals(dueNow(s, NOW).length, 0, "nothing due the day it is booked");
  const later = new Date("2026-11-20T10:00:00Z");
  assertEquals(dueNow(s, later).map((i) => i.n), [2], "the second payment, 30 days on");
  s[1].status = "failed"; s[1].retry_after = "2026-11-22T14:00:00Z";
  assertEquals(dueNow(s, later).length, 0, "waiting for the retry date");
  assertEquals(dueNow(s, new Date("2026-11-22T15:00:00Z")).map((i) => i.n), [2], "retry date passed");
  assertEquals(needReminder(s, 3, new Date("2026-11-16T09:00:00Z")).map((i) => i.n), [], "already failed, not a reminder case");
  const fresh = buildSchedule("instalments", 600, plus(120), NOW);
  assertEquals(needReminder(fresh, 3, new Date("2026-11-16T09:00:00Z")).map((i) => i.n), [2]);
  fresh[1].reminded = true;
  assertEquals(needReminder(fresh, 3, new Date("2026-11-16T09:00:00Z")).length, 0, "only once");
});

Deno.test("allPaid and reading a saved schedule defensively", () => {
  const s = buildSchedule("instalments", 600, plus(120), NOW);
  assert(!allPaid(s));
  s.forEach((i) => (i.status = "paid"));
  assert(allPaid(s));
  assertEquals(allPaid([]), false);
  assertEquals(readSchedule(null), []);
  assertEquals(readSchedule("junk"), []);
  const r = readSchedule([{ n: 1, amount: "12.5", due: "bad", status: "weird", how: "card" }]);
  assertEquals([r[0].amount, r[0].due, r[0].status, r[0].how], [12.5, "", "pending", "card"]);
});
