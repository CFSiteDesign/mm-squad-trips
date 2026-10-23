import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { needsDeposit, parseDeposit, planLabel, plainFirstName, plainText } from "./trip-builder.ts";
import { readSummary } from "./trip-builder-crew.ts";
import { tripBuilderBookedEmail, tripBuilderOpsEmail, tripBuilderReadyEmail, tripBuilderReceivedEmail, tripBuilderReminderEmail } from "./email.ts";

Deno.test("free to send is the default; the deposit switch only takes whole dollars from 1 to 1000", () => {
  for (const v of [undefined, null, "", "  ", "0", "abc", "-5", "1001", "5000", "NaN", "Infinity", "$50", "fifty"]) assertEquals(parseDeposit(v), 0, `${JSON.stringify(v)} is free`);
  assertEquals(parseDeposit("50"), 50);
  assertEquals(parseDeposit(" 50 "), 50);
  assertEquals(parseDeposit(50), 50);
  assertEquals(parseDeposit("50.4"), 50);
  assertEquals(parseDeposit("1000"), 1000);
  assertEquals(parseDeposit("1"), 1);
});

Deno.test("a trip is only waiting on a deposit when one is owed and unpaid", () => {
  assertEquals(needsDeposit({ deposit_amount: 0, deposit_paid_at: null }), false, "free to send: nothing to wait for");
  assertEquals(needsDeposit({ deposit_amount: "0.00", deposit_paid_at: null }), false);
  assertEquals(needsDeposit({ deposit_amount: 100, deposit_paid_at: null }), true);
  assertEquals(needsDeposit({ deposit_amount: 100, deposit_paid_at: "2026-10-23T10:00:00Z" }), false);
  assertEquals(needsDeposit({}), false);
});

Deno.test("names and routes that are printed in emails to someone else's address are plain text only", () => {
  for (const n of ["Sam", "José", "Mary-Jane", "O'Brien", "Zoë", "Sam Lee", "Æsa"]) assertEquals(plainFirstName(n), n.split(" ")[0], n);
  for (const n of ["", "   ", "123", "<script>x</script>", "a".repeat(40), "(Sam)", "http://evil.example", "a@b.co", null, undefined, 5, { x: 1 }]) assertEquals(plainFirstName(n), "there", JSON.stringify(n));
  // only the first word is ever printed, so a message typed into the name field can't reach someone's inbox
  assertEquals(plainFirstName("Click http://evil.example"), "Click");
  assertEquals(plainFirstName("Your account is locked, call 555 1234"), "Your");
  assertEquals(plainText("Hanoi → Hoi An → Ho Chi Minh City"), "Hanoi → Hoi An → Ho Chi Minh City");
  assertEquals(plainText("Hoi An: 4 nights"), "Hoi An: 4 nights");
  assertEquals(plainText("Removed Ho Chi Minh City", 140), "Removed Ho Chi Minh City");
  for (const bad of ["", "see http://evil.example/login", "https://x.y", "visit evil.com now", "go to www.evil", "<b>hi</b>", "a@b.co", "x".repeat(161), "line one\nline two", null, undefined, { a: 1 }]) assertEquals(plainText(bad), "", JSON.stringify(bad));
  assertEquals(plainText("x".repeat(200), 300), "x".repeat(200), "the cap can be raised");
});

Deno.test("plan wording: 'the rest' only when a deposit has been paid", () => {
  assertEquals(planLabel("later"), "pay the rest on the card a week before you leave");
  assertEquals(planLabel("instalments"), "pay the rest in instalments");
  assertEquals(planLabel("now"), "pay the rest now");
  assertEquals(planLabel("later", false), "pay on the card a week before you leave");
  assertEquals(planLabel("instalments", false), "pay in instalments");
  assertEquals(planLabel("now", false), "pay now");
  assertEquals(planLabel(null, false), "pay now");
});

const received = (o: Record<string, unknown> = {}) => tripBuilderReceivedEmail({ firstName: "Sam", ref: "MM-ABC234", route: "Hanoi → Hoi An", days: 9, startDate: "Mon 1 Mar 2027", people: 1, holdUntil: "", statusUrl: "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/trip/MM-ABC234?k=abc", ...o });

Deno.test("the email for a free trip says nothing has been paid, and never mentions a deposit or a refund", () => {
  const m = received();
  assertStringIncludes(m.subject, "MM-ABC234");
  assertStringIncludes(m.html, "you haven't paid anything");
  assertStringIncludes(m.html, "Hanoi → Hoi An");
  assertStringIncludes(m.html, "#/trip/MM-ABC234?k=abc");
  assert(!/deposit/i.test(m.html.replace(/<[^>]+>/g, " ")), "no deposit talk");
  assert(!/refund/i.test(m.html.replace(/<[^>]+>/g, " ").replace(/nothing to refund/gi, "")), "no refund talk beyond 'nothing to refund'");
  assertStringIncludes(received({ holdUntil: "Wed 25 Oct, 10:00 UTC" }).html, "holding your beds until");
  assertStringIncludes(received({ holdUntil: "" }).html, "pin down dates");
  assertStringIncludes(received({ people: 3 }).html, "(3 people)");
  assert(!received({ route: "" }).html.includes("<strong></strong>"), "no empty route");
});

Deno.test("what a sender typed is escaped in the guest's email", () => {
  const m = received({ firstName: `<img src=x onerror=alert(1)>`, route: `<script>alert(1)</script>`, startDate: `"><b>x` });
  assert(!/<img src=x|<script>alert|<b>x/.test(m.html), "no markup got through");
});

const sum = () => readSummary({ summary: { headline: "Hanoi", days: 9, nights: 8, stopCount: 2, countries: ["Vietnam"], start: "2027-03-01", end: "2027-03-09", people: 2, pref: "Smart pick", stops: [], budget: { beds: 100, tours: 40, transport: 60, allIn: 0, squadDiscount: 0, tripCost: 200, spendPerDay: 20, spendFund: 120, total: 320, people: 2, tripCostAllPeople: 400, totalAllPeople: 640, guestBudget: 0, budgetLeft: null }, flags: [] } });
const ops = (deposit: string, suggested: string) => tripBuilderOpsEmail({
  ref: "MM-ABC234", name: "Sam Lee", contact: "Email sam@example.com", guestEmail: "sam@example.com", people: 2, route: "Hanoi", days: 9, startDate: "Mon 1 Mar 2027", dates: "fixed",
  estTotal: "$320", deposit, allInMatch: "", notes: "", itinerary: "x", tripLink: "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/i=s.hanoi.4", adminUrl: "https://madmonkeyhostels.com/all-in-trips/admin",
  holdUntil: "", summary: sum(), suggestedBalance: suggested,
});
const plain = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

Deno.test("the crew's email says 'free to send' when nothing was paid, and still shows a deposit when there was one", () => {
  const free = plain(ops("", "$400").html);
  assertStringIncludes(free, "Free to send: nothing paid yet");
  assertStringIncludes(free, "Nothing paid yet (free to send)");
  assertStringIncludes(free, "suggested price $400");
  assert(!/Deposit paid/.test(free) && !/less the deposit/.test(free), "no deposit lines");
  const paid = plain(ops("$100", "$300").html);
  assertStringIncludes(paid, "Deposit paid $100");
  assertStringIncludes(paid, "suggested balance $300");
  assertStringIncludes(paid, "less the deposit");
});

const ready = (hasDeposit?: boolean) => tripBuilderReadyEmail({ firstName: "Sam", ref: "MM-ABC234", route: "Hanoi", balance: "$512", note: "", payUrl: "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/trip/MM-ABC234?k=a", statusUrl: "https://madmonkeyhostels.com/x", choices: ["Pay all $512 now"], ...(hasDeposit === undefined ? {} : { hasDeposit }) });

Deno.test("the 'checked' email asks for the price, not 'the rest', when nothing was paid up front", () => {
  const free = ready(false);
  assertStringIncludes(plain(free.html), "The price for your trip is $512");
  assertStringIncludes(plain(free.html), "You haven't paid anything yet");
  assert(!/deposit/i.test(plain(free.html)) && !/the rest/i.test(free.subject), "no deposit talk");
  assertStringIncludes(free.subject, "choose how to pay (MM-ABC234)");
  for (const m of [ready(true), ready()]) {
    assertStringIncludes(plain(m.html), "The rest to pay is $512");
    assertStringIncludes(plain(m.html), "Your deposit is already taken off");
    assertStringIncludes(m.subject, "choose how to pay the rest");
  }
});

Deno.test("the booked email only talks about a deposit when there was one, and the card is 'saved with us' otherwise", () => {
  const args = { firstName: "Sam", ref: "MM-ABC234", route: "Hanoi", planLabel: "pay in instalments", schedule: [{ amount: "$128", due: "Today", paid: true }], statusUrl: "https://madmonkeyhostels.com/x", startDate: "Mon 1 Mar 2027" };
  const free = plain(tripBuilderBookedEmail({ ...args, deposit: "" }).html);
  assertStringIncludes(free, "You've chosen to pay in instalments");
  assertStringIncludes(free, "saved with us");
  assert(!/deposit/i.test(free), "no deposit talk");
  const paid = plain(tripBuilderBookedEmail({ ...args, planLabel: "pay the rest in instalments", deposit: "$100" }).html);
  assertStringIncludes(paid, "Your $100 deposit is counted");
  assertStringIncludes(paid, "paid your deposit with");
});

Deno.test("the reminder names the card as the one saved with us (true with or without a deposit)", () => {
  const m = tripBuilderReminderEmail({ firstName: "Sam", ref: "MM-ABC234", route: "Hanoi", amount: "$128", due: "Wed 18 Nov", statusUrl: "https://madmonkeyhostels.com/x" });
  assertStringIncludes(plain(m.html), "the card you saved with us");
});
