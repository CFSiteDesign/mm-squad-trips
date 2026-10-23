import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { readStage, readSummary } from "./trip-builder-crew.ts";
import { tripBuilderLoginEmail, tripBuilderOpsEmail } from "./email.ts";

const BUDGET = { beds: 100, tours: 40, transport: 60, allIn: 0, squadDiscount: 0, tripCost: 200, spendPerDay: 20, spendFund: 120, total: 320, people: 1, tripCostAllPeople: 200, totalAllPeople: 320, guestBudget: 0, budgetLeft: null };
const STOP = { kind: "stop", name: "Phnom Penh", country: "Cambodia", nights: 3, days: 3, usd: 0, from: "2027-03-01", to: "2027-03-04", route: "", bedUsd: 9, bedsUsd: 27, partner: false, tours: [], next: null };
const STAGE = { n: 3, parent: "MM-ABC234", from: { id: "saigon", name: "Ho Chi Minh City" }, been: ["Hanoi", "Hoi An", "Ho Chi Minh City"], arrival: { to: "Phnom Penh", mode: "Bus", hours: "7h", usd: 13, overnight: false, date: "2027-03-01" } };
const summary = (stage: unknown) => readSummary({ summary: { headline: "Phnom Penh", days: 4, nights: 3, stopCount: 1, countries: ["Cambodia"], start: "2027-03-01", end: "2027-03-04", people: 1, pref: "Smart pick", stops: [STOP], budget: BUDGET, flags: [], stage } });
const opsArgs = (sum: ReturnType<typeof summary>) => ({
  ref: "MM-NEW123", name: "Sam Lee", contact: "Email sam@example.com", guestEmail: "sam@example.com", people: 1, route: "Phnom Penh", days: 4, startDate: "Mon 1 Mar 2027", dates: "fixed",
  estTotal: "$320", deposit: "$50", allInMatch: "", notes: "", itinerary: "x", tripLink: "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/i=s.phnom-penh.3", adminUrl: "https://madmonkeyhostels.com/all-in-trips/admin", holdUntil: "", summary: sum,
});

Deno.test("a stage is read safely: the number is kept in range, the parent has to look like a trip reference, odd fields are dropped", () => {
  assertEquals(readStage(null), null);
  assertEquals(readStage("x"), null);
  assertEquals(readStage(STAGE)?.n, 3);
  assertEquals(readStage({ n: 99 })?.n, 20);
  assertEquals(readStage({ n: 0 })?.n, 2);
  assertEquals(readStage({ n: "x" })?.n, 2);
  assertEquals(readStage({ n: 2, parent: "<img src=x>" })?.parent, "");
  assertEquals(readStage({ n: 2, parent: "MM-ABC234" })?.parent, "MM-ABC234");
  const s = readStage({ n: 2, from: { id: 5, name: { x: 1 } }, been: [1, null, "Hanoi", ..."abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz".split("")], arrival: { to: "X", usd: "nope", overnight: "yes", date: "soon" } });
  assert(s !== null && s.from?.id === "" && s.from?.name === "" && s.been[0] === "Hanoi" && s.been.length <= 40 && s.arrival?.usd === 0 && s.arrival?.overnight === false && s.arrival?.date === "");
});

Deno.test("the summary carries the stage; an older summary has none", () => {
  assertEquals(summary(STAGE)?.stage?.from?.name, "Ho Chi Minh City");
  assertEquals(summary(undefined)?.stage, null);
  assertEquals(summary(null)?.stage, null);
});

Deno.test("the crew email says which stage it is, where they start, where they have been and which trip came first", () => {
  const m = tripBuilderOpsEmail(opsArgs(summary(STAGE)));
  assertStringIncludes(m.subject, "Stage 3 · ");
  for (const t of ["Stage 3 of their journey", "already travelling", "Starting from", "Ho Chi Minh City", "Bus to Phnom Penh", "Already been to Hanoi, Hoi An, Ho Chi Minh City", "MM-ABC234", "Only the new stops need checking"]) assertStringIncludes(m.html, t);
  const plain = tripBuilderOpsEmail(opsArgs(summary(null)));
  assert(!/Stage \d+ of their journey/.test(plain.html) && !/^Stage/.test(plain.subject), "an ordinary trip shows no stage");
});

Deno.test("nothing a guest puts in the stage can break out of the crew email", () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const m = tripBuilderOpsEmail(opsArgs(summary({ ...STAGE, from: { id: "x", name: evil }, been: [evil, "Hanoi"], arrival: { ...STAGE.arrival, to: evil, mode: evil } })));
  assert(!m.html.includes("<img src=x") && !m.html.includes("<script>alert"), "markup in the stage is printed as text");
});

Deno.test("the log-in email lists each trip with its own link, and prints nothing as markup", () => {
  const evil = '<img src=x onerror=alert(1)>';
  const one = tripBuilderLoginEmail({ firstName: "Sam", trips: [{ ref: "MM-ABC234", route: "Hanoi → Hoi An", days: 12, status: "checking", url: "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/trip/MM-ABC234?k=abc.def" }] });
  assertStringIncludes(one.subject, "Hanoi → Hoi An");
  assertStringIncludes(one.html, "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/trip/MM-ABC234?k=abc.def");
  assertStringIncludes(one.html, "plan your next stage");
  assertStringIncludes(one.html, "A real person checks every trip before anything is booked");
  const two = tripBuilderLoginEmail({ firstName: evil, trips: [{ ref: "MM-ABC234", route: evil, days: 5, status: "approved", url: "https://x.test/#/trip/MM-ABC234?k=1" }, { ref: "MM-DEF567", route: "Laos", days: 8, status: "ready", url: "https://x.test/#/trip/MM-DEF567?k=2" }] });
  assertEquals(two.subject, "Your Mad Monkey trips");
  assert(!two.html.includes("<img src=x"), "a route or name is printed as text");
  assertStringIncludes(two.html, "MM-DEF567");
});
