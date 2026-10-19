import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { crewReviewUrl, readSummary, signCrewKey, suggestBalance, verifyCrewKey } from "./trip-builder-crew.ts";

const SECRET = "test-secret";
const NOW = Date.UTC(2026, 9, 20);

Deno.test("a crew key works for its own trip and nothing else", async () => {
  const key = await signCrewKey("MM-ABC234", SECRET, NOW);
  assert(await verifyCrewKey("MM-ABC234", key, SECRET, NOW));
  assert(!(await verifyCrewKey("MM-ABC235", key, SECRET, NOW)), "another trip's key must fail");
});

Deno.test("a crew key stops working after 30 days, and not before", async () => {
  const key = await signCrewKey("MM-ABC234", SECRET, NOW);
  assert(await verifyCrewKey("MM-ABC234", key, SECRET, NOW + 29 * 86400_000));
  assert(!(await verifyCrewKey("MM-ABC234", key, SECRET, NOW + 31 * 86400_000)));
});

Deno.test("tampered, empty and wrong-secret keys fail", async () => {
  const key = await signCrewKey("MM-ABC234", SECRET, NOW);
  const [exp, sig] = key.split(".");
  assert(!(await verifyCrewKey("MM-ABC234", `${exp}.${sig.slice(0, -1)}${sig.endsWith("0") ? "1" : "0"}`, SECRET, NOW)), "one changed character must fail");
  assert(!(await verifyCrewKey("MM-ABC234", `${(parseInt(exp, 36) + 99999).toString(36)}.${sig}`, SECRET, NOW)), "extending the expiry must fail");
  assert(!(await verifyCrewKey("MM-ABC234", "", SECRET, NOW)));
  assert(!(await verifyCrewKey("MM-ABC234", undefined, SECRET, NOW)));
  assert(!(await verifyCrewKey("MM-ABC234", key, "other-secret", NOW)));
  assert(!(await verifyCrewKey("MM-ABC234", key, "", NOW)), "no secret configured means no key is accepted");
});

Deno.test("review links keep the key in the #fragment and open the right panel", () => {
  const u = crewReviewUrl("https://madmonkeyhostels.com", "MM-ABC234", "k1.sig", "approve");
  assertEquals(u, "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/crew/MM-ABC234?k=k1.sig&do=approve");
  assertStringIncludes(crewReviewUrl(null, "MM-ABC234", "k1.sig"), "#/crew/MM-ABC234?k=k1.sig");
  assert(!crewReviewUrl(null, "MM-ABC234", "k1.sig").includes("&do="));
});

Deno.test("readSummary cleans what the browser sent, and returns null for old trips", () => {
  assertEquals(readSummary({ itinerary: "old" }), null);
  assertEquals(readSummary(null), null);
  const sum = readSummary({ summary: {
    headline: "Hanoi → Hoi An", days: 8, people: 99, start: "not a date",
    stops: [{ kind: "stop", name: "Hanoi", nights: 4, tours: [{ name: "Ninh Binh", usd: 48, date: "2026-11-14" }], next: { to: "Hoi An", mode: "Flight", usd: 65 } }],
    budget: { tripCostAllPeople: 702, total: 571 }, flags: [{ level: "warn", text: "x" }, { level: "weird", text: "y" }],
  } });
  assert(sum);
  assertEquals(sum.people, 8, "party size is capped");
  assertEquals(sum.start, "", "bad dates are dropped");
  assertEquals(sum.stops[0].tours[0].date, "2026-11-14");
  assertEquals(sum.stops[0].next?.usd, 65);
  assertEquals(sum.flags.map((f) => f.level), ["warn", "info"]);
});

Deno.test("suggested balance is the trip cost for everyone less the deposit, never negative", () => {
  const sum = readSummary({ summary: { stops: [], budget: { tripCostAllPeople: 702 } } });
  assertEquals(suggestBalance(sum, 100), 602);
  assertEquals(suggestBalance(sum, 5000), 0);
  assertEquals(suggestBalance(null, 100), 0);
});
