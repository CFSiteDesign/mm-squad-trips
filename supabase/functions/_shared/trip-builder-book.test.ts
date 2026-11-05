import { assert, assertEquals } from "jsr:@std/assert@1";
import { allInPaidPerSpot, allInSessionForKey, allInSlug, movedTrip, toBookList, tripRefFromSession } from "./trip-builder-book.ts";
import { readSummary } from "./trip-builder-crew.ts";
import { tripBuilderConfirmedEmail, tripBuilderDatesMovedEmail, tripBuilderToBookBlock } from "./email.ts";

// Famke's trip, MM-25Y4TL, as the builder sent it.
const famke = readSummary({ summary: {
  budget: { allIn: 850 }, people: 1, start: "2026-11-25", end: "2026-12-10",
  stops: [
    { id: "vietnam", kind: "allin", name: "ALL IN Vietnam", days: 14, nights: 13, from: "2026-11-25", to: "2026-12-08", route: "Hanoi → Hoi An", usd: 850, tours: [], next: null },
    { id: "hoi-an", kind: "stop", name: "Hoi An", country: "Vietnam", nights: 2, from: "2026-12-08", to: "2026-12-10", bedUsd: 5.41, bedsUsd: 11, partner: false, next: null,
      tours: [{ name: "Ba Na Hills + Golden Bridge", usd: 66, date: "2026-12-09", day: 15, fits: true }] },
  ],
} });

Deno.test("Famke's list reads the way Ewan wrote it", () => {
  assertEquals(toBookList(famke, 1).map((i) => i.text), [
    "ALL IN Vietnam · Wed 25 Nov to Tue 8 Dec · 1 person",
    "Mad Monkey Hoi An · 2 nights · in Tue 8 Dec, out Thu 10 Dec · 1 bed",
    "Ba Na Hills + Golden Bridge · Wed 9 Dec · 1 person",
  ]);
});

Deno.test("ALL INs come first, flights are left off, travel and partner hostels are on it", () => {
  const sum = readSummary({ summary: { budget: {}, stops: [
    { kind: "stop", name: "Bangkok", nights: 1, from: "2027-01-01", to: "2027-01-02", partner: true, tours: [{ name: "Cooking class", day: 1, fits: false, payOnDay: true }], next: { to: "Hanoi", mode: "Flight", date: "2027-01-02" } },
    { kind: "stop", name: "Hanoi", nights: 1, from: "2027-01-02", to: "2027-01-03", tours: [], next: { to: "Sapa", mode: "Night bus", date: "2027-01-03" } },
    { id: "loop", kind: "allin", name: "ALL IN Ha Giang Loop", from: "2027-01-06", to: "2027-01-13", usd: 310, tours: [] },
  ] } });
  const list = toBookList(sum, 2);
  assertEquals(list[0].text, "ALL IN Ha Giang Loop · Wed 6 Jan to Wed 13 Jan · 2 people");
  assertEquals(list[0].key, "allin:vietnam-7:2027-01-06");
  assert(list.some((i) => i.text === "Bangkok (partner hostel) · 1 night · in Fri 1 Jan, out Sat 2 Jan · 2 beds"));
  assert(list.some((i) => i.text === "Cooking class · day 1 · 2 people · they pay on the day · NO ROOM on that day, check it"));
  assert(list.some((i) => i.text === "Night bus to Sapa · Sun 3 Jan · 2 people"));
  assert(!list.some((i) => /flight/i.test(i.text)));
});

Deno.test("a trip sent before summaries existed has no list", () => {
  assertEquals(toBookList(null, 1), []);
});

Deno.test("the builder's ALL IN names map to the site's slugs", () => {
  assertEquals(allInSlug("vietnam"), "vietnam");
  assertEquals(allInSlug("loop"), "vietnam-7");
  assertEquals(allInSlug("gili-lombok"), "indonesia-7");
  assertEquals(allInSessionForKey("MM-25Y4TL", "allin:vietnam:2026-11-25"), "tb:MM-25Y4TL:vietnam:2026-11-25");
});

Deno.test("money reaches the ALL IN first, per spot, and never over its price", () => {
  assertEquals(allInPaidPerSpot([{ usd: 850 }], 927, 1), [850]);
  assertEquals(allInPaidPerSpot([{ usd: 850 }], 99, 1), [99]);
  assertEquals(allInPaidPerSpot([{ usd: 850 }], 0, 1), [0]);
  assertEquals(allInPaidPerSpot([{ usd: 850 }], 500, 2), [250]);
  assertEquals(allInPaidPerSpot([{ usd: 400 }, { usd: 300 }], 500, 1), [400, 100]);
});

Deno.test("the crew's list shows what's in bookings and shouts about what isn't", () => {
  const list = toBookList(famke, 1);
  const base = { ref: "MM-25Y4TL", name: "Famke", people: 1, paid: "paid in full $927", items: list };
  const added = tripBuilderToBookBlock({ ...base, allIn: [{ key: list[0].key, added: true }] });
  assert(added.includes("TO BOOK: MM-25Y4TL · Famke · 1 person · paid in full $927"));
  assert(added.includes("Flights: not ours to book."));
  assert(added.includes("In ALL IN bookings"));
  assert(!added.includes("NOT IN ALL IN BOOKINGS"));
  const failed = tripBuilderToBookBlock({ ...base, allIn: [{ key: list[0].key, added: false, problem: "Full <today>" }] });
  assert(failed.includes("NOT IN ALL IN BOOKINGS"));
  assert(failed.includes("Full &lt;today&gt;"));
});

Deno.test("older trips with no list still tell the crew to book it", () => {
  const html = tripBuilderToBookBlock({ ref: "MM-OLD111", name: "Sam", people: 1, paid: "paid in full $100", items: [], allIn: [] });
  assert(html.includes("sent before we kept a stop-by-stop list"));
});

Deno.test("the guest is told we're booking it, not that it's booked", () => {
  const { html } = tripBuilderConfirmedEmail({ firstName: "Famke", ref: "MM-25Y4TL", route: "Hanoi → Hoi An", paid: "$927", statusUrl: "https://example.com" });
  assert(html.includes("We've got your <strong>$927</strong>, so you're paid in full. The crew are booking each part of your trip now and will be in touch before you go."));
  assert(!html.includes("locked in"));
});

const booked = () => ({
  ref: "MM-25Y4TL", start_date: "2026-11-25", party_size: 1, itinerary: "THE PLAN", trip_link: "https://x.test/#/build/i=a.vietnam&d=2026-11-25&p=cheap",
  pay_schedule: [
    { n: 1, amount: 99, due: "2026-11-03", how: "checkout", status: "paid", attempts: 0, reminded: false, paid_at: "2026-11-03", payment_intent: "pi", last_error: null, retry_after: null },
    { n: 2, amount: 828, due: "2026-11-18", how: "card", status: "pending", attempts: 0, reminded: true, paid_at: null, payment_intent: null, last_error: null, retry_after: null },
  ],
  payload: { trip: { start: "2026-11-25", link: "https://x.test/#/build/i=a.vietnam&d=2026-11-25&p=cheap", state: "i=a.vietnam&d=2026-11-25&p=cheap" }, summary: {
    start: "2026-11-25", end: "2026-12-10", budget: {},
    stops: [
      { id: "vietnam", kind: "allin", name: "ALL IN Vietnam", from: "2026-11-25", to: "2026-12-08", usd: 850, tours: [], next: null },
      { id: "hoi-an", kind: "stop", name: "Hoi An", nights: 2, from: "2026-12-08", to: "2026-12-10", next: { to: "Hue", mode: "Bus", date: "2026-12-10" }, tours: [{ name: "Ba Na Hills", date: "2026-12-09", fits: true }] },
    ],
  } },
});

Deno.test("moving a trip moves every date on it by the same number of days", () => {
  const row = booked();
  const { days, patch } = movedTrip(row, "2026-12-02");
  assertEquals(days, 7);
  assertEquals(patch.start_date, "2026-12-02");
  const list = toBookList(readSummary(patch.payload), 1).map((i) => i.text);
  assertEquals(list, [
    "ALL IN Vietnam · Wed 2 Dec to Tue 15 Dec · 1 person",
    "Mad Monkey Hoi An · 2 nights · in Tue 15 Dec, out Thu 17 Dec · 1 bed",
    "Ba Na Hills · Wed 16 Dec · 1 person",
    "Bus to Hue · Thu 17 Dec · 1 person",
  ]);
  assert(String(patch.trip_link).includes("d=2026-12-02"));
  assert(String((patch.payload as { trip: { state: string } }).trip.state).includes("d=2026-12-02"));
  assert(String(patch.itinerary).startsWith("DATES MOVED"));
  assertEquals((row.payload.summary.stops[0] as { from: string }).from, "2026-11-25", "the row itself isn't touched");
});

Deno.test("payments still to come move and get a fresh reminder; paid ones stay as they were", () => {
  const { patch, nextPayment } = movedTrip(booked(), "2026-12-02");
  const items = patch.pay_schedule as { due: string; status: string; reminded: boolean }[];
  assertEquals(items[0].due, "2026-11-03");
  assertEquals(items[1].due, "2026-11-25");
  assertEquals(items[1].reminded, false);
  assertEquals(nextPayment?.amount, 828);
});

Deno.test("a failed payment doesn't retry before its new date", () => {
  const row = booked();
  Object.assign(row.pay_schedule[1], { status: "failed", retry_after: "2026-11-20T14:00:00.000Z" });
  const items = movedTrip(row, "2026-12-02").patch.pay_schedule as { retry_after: string }[];
  assertEquals(items[1].retry_after, "2026-11-25T14:00:00.000Z");
});

Deno.test("only trip builder bookings point back at a trip", () => {
  assertEquals(tripRefFromSession("tb:MM-25Y4TL:vietnam:2026-11-25"), "MM-25Y4TL");
  assertEquals(tripRefFromSession("cs_live_abc"), null);
  assertEquals(tripRefFromSession(null), null);
});

Deno.test("the guest hears their new dates, and their next payment only if there is one", () => {
  const base = { firstName: "Sam", ref: "MM-25Y4TL", route: "Hanoi", startDate: "Wed 2 Dec 2026", statusUrl: "https://example.com" };
  assert(tripBuilderDatesMovedEmail({ ...base, nextAmount: "$828", nextDue: "Wed 25 Nov 2026" }).html.includes("$828"));
  assert(!tripBuilderDatesMovedEmail({ ...base, nextAmount: "", nextDue: "" }).html.includes("next payment"));
});
