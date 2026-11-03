import { assert, assertEquals } from "jsr:@std/assert@1";
import { cleanCrew, crewAnswers, introPair, onCrewBoard } from "./trip-builder-find-crew.ts";
import { tripBuilderOpsEmail } from "./email.ts";

const good = { on: true, consent: true, adult: true, age: "22-25", gender: "woman", home: "UK", life: ["gap-year", "quit-job"], vibes: ["party", "islands"], about: "Just quit finance. Here for sunsets.", want: { who: "women", ages: "near", solo: false } };

Deno.test("Find your crew needs it switched on, the 18+ tick, the consent tick and a known age", () => {
  assertEquals(cleanCrew(good)?.age, "22-25");
  for (const bad of [null, undefined, "yes", 5, [], {}, { ...good, on: false }, { ...good, on: "true" }, { ...good, consent: false }, { ...good, adult: false }, { ...good, consent: undefined }, { ...good, adult: "yes" }, { ...good, age: "16-17" }, { ...good, age: undefined }]) {
    assertEquals(cleanCrew(bad), null, JSON.stringify(bad));
  }
});

Deno.test("only known values survive, at most three picks per list", () => {
  const c = cleanCrew({ ...good, gender: "robot", life: ["gap-year", "made-up", "gap-year", "remote", "graduated", "sabbatical"], vibes: ["surf", "<b>", 7, "food", "chill", "moto"], want: { who: "nobody", ages: "weird", solo: "yes" }, extra: "dropped" })!;
  assertEquals(c.gender, "");
  assertEquals(c.life, ["gap-year", "remote", "graduated"]);
  assertEquals(c.vibes, ["surf", "food", "chill"]);
  assertEquals(c.want, { who: "anyone", ages: "near", solo: false });
  assert(!("extra" in c));
  assertEquals(cleanCrew({ ...good, life: "gap-year", vibes: null })?.life, []);
});

Deno.test("the free text is plain single-line text: home 40 characters, about 140", () => {
  const c = cleanCrew({ ...good, home: "  x".repeat(40), about: "<script>alert(1)</script>\nsecond\tline " + "y".repeat(200) })!;
  assert(c.home.length <= 40);
  assert(c.about.length <= 140);
  assert(!/[<>\n\t]/.test(c.about), c.about);
  assertEquals(cleanCrew({ ...good, home: 5, about: null })?.about, "");
});

Deno.test("women only is accepted only from someone who said they're a woman", () => {
  assertEquals(cleanCrew(good)?.want.who, "women");
  for (const gender of ["man", "nonbinary", "", undefined]) assertEquals(cleanCrew({ ...good, gender })?.want.who, "anyone", String(gender));
});

Deno.test("the answers for the crew email read as words, and only when it's on", () => {
  const rows = Object.fromEntries(crewAnswers(cleanCrew({ ...good, want: { who: "women", ages: "any", solo: true } })).map((r) => [r.k, r.v]));
  assertEquals(rows["Age"], "22–25");
  assertEquals(rows["Wants to meet"], "Women only, any age (18+), only people travelling solo");
  assertEquals(rows["Where they're at"], "Gap year, Quit my job");
  assertEquals(rows["Vibe"], "Party + people, Islands + beaches");
  assertEquals(crewAnswers(null), []);
  assertEquals(crewAnswers({ on: false }), []);
});

Deno.test("the new-trip email shows their answers, escaped, and nothing when it's off", () => {
  const base = { ref: "MM-ABC123", name: "Sam", contact: "Email sam@example.com", guestEmail: "sam@example.com", people: 1, route: "Hanoi", days: 5, startDate: "", dates: "", estTotal: "", deposit: "", allInMatch: "", notes: "", itinerary: "", tripLink: "", adminUrl: "", holdUntil: "" };
  const on = tripBuilderOpsEmail({ ...base, findCrew: [{ k: "About them", v: "Fish & chips <3" }] }).html;
  assert(on.includes("Find your crew is on"));
  assert(on.includes("Fish &amp; chips &lt;3"));
  assert(!tripBuilderOpsEmail({ ...base, findCrew: [] }).html.includes("Find your crew"));
  assert(!tripBuilderOpsEmail(base).html.includes("Find your crew"));
});

Deno.test("an introduction is one pair whichever way round, never a trip with itself", () => {
  assertEquals(introPair("MM-BBBBBB", "mm-aaaaaa"), { a: "MM-AAAAAA", b: "MM-BBBBBB" });
  assertEquals(introPair("MM-AAAAAA", "MM-BBBBBB"), { a: "MM-AAAAAA", b: "MM-BBBBBB" });
  assertEquals(introPair("MM-AAAAAA", "MM-AAAAAA"), null);
  assertEquals(introPair("MM-AAAAAA", "nope"), null);
  assertEquals(introPair(undefined, "MM-AAAAAA"), null);
});

Deno.test("the crew board leaves out trips that are declined, not yet sent or over", () => {
  const now = new Date("2026-11-03T10:00:00Z");
  for (const status of ["submitted", "checking", "ready", "approved"]) assert(onCrewBoard({ status, start_date: "2026-12-01", days: 10 }, now), status);
  for (const status of ["declined", "pending_payment"]) assert(!onCrewBoard({ status, start_date: "2026-12-01", days: 10 }, now), status);
  assert(onCrewBoard({ status: "submitted", start_date: null, days: 10 }, now), "no date yet");
  assert(onCrewBoard({ status: "approved", start_date: "2026-10-30", days: 10 }, now), "still on it");
  assert(onCrewBoard({ status: "approved", start_date: "2026-10-24", days: 10 }, now), "the last day");
  assert(!onCrewBoard({ status: "approved", start_date: "2026-10-23", days: 10 }, now), "over");
});
