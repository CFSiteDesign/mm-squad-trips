import { assert, assertEquals } from "jsr:@std/assert@1";
import { cleanRevision, currentRev, EDITABLE, guestCanEdit, lastRevision, ownTripLink, revisionPatch } from "./trip-builder-revise.ts";

const SITE = "https://madmonkeyhostels.com";
const LINK = `${SITE}/all-in-trips/trip-builder/#/build/i=s.hanoi.4~s.hoi-an.4&d=2027-02-10`;
const body = (over: Record<string, unknown> = {}) => ({
  trip: { link: LINK, route: "Hanoi → Hoi An", days: 9, nights: 8, stops: ["hanoi", "hoi-an"], countries: ["VN"], start: "2027-02-10", estTotalUsd: 480.5 },
  summary: { stops: [], headline: "x" }, crewText: "CREW TEXT", itinerary: "ITIN", note: "  swapped Saigon for Hoi An  ", changes: ["Removed Saigon", "Added Hoi An"], ...over,
});
const row = (over: Record<string, unknown> = {}) => ({
  status: "submitted", route: "Hanoi → Saigon", days: 10, est_total_usd: 500, start_date: "2027-02-10", trip_link: `${SITE}/all-in-trips/trip-builder/#/build/i=s.hanoi.4~s.saigon.4`,
  itinerary: "old", payload: { summary: { stops: ["old"] }, original: { trip: {} }, revision: { at: "x" } }, ...over,
});
const clean = (b: Record<string, unknown> = body()) => { const c = cleanRevision(b, SITE); assert(c.ok, JSON.stringify(c)); return c.ok ? c : (null as never); };

Deno.test("a guest can change a trip until it is booked", () => {
  assertEquals(EDITABLE, ["pending_payment", "submitted", "checking", "ready"]);
  for (const s of EDITABLE) assert(guestCanEdit(s), s);
  for (const s of ["approved", "declined", "refunded", "", undefined, null]) assert(!guestCanEdit(s), String(s));
});

Deno.test("only links into our own trip builder are accepted (the crew opens these from an email)", () => {
  assert(ownTripLink(LINK, SITE));
  assert(!ownTripLink("https://evil.example/#/build/i=s.hanoi.4", SITE));
  assert(!ownTripLink("https://madmonkeyhostels.com.evil.example/#/build/x", SITE));
  assert(!ownTripLink("javascript:alert(1)//#/build/", SITE));
  assert(!ownTripLink(`${SITE}/all-in-trips/trip-builder/`, SITE));        // no trip in it
  assert(!ownTripLink("not a url", SITE));
});

Deno.test("a revision is checked and cleaned", () => {
  const c = clean();
  assertEquals(c.f.route, "Hanoi → Hoi An"); assertEquals(c.f.days, 9); assertEquals(c.f.start, "2027-02-10"); assertEquals(c.f.estTotalUsd, 480.5);
  assertEquals(c.note, "swapped Saigon for Hoi An"); assertEquals(c.changes, ["Removed Saigon", "Added Hoi An"]);
  assert(!cleanRevision(body({ trip: { ...body().trip, route: "" } }), SITE).ok);
  assert(!cleanRevision(body({ trip: { ...body().trip, days: 0 } }), SITE).ok);
  assert(!cleanRevision(body({ trip: { ...body().trip, days: 5000 } }), SITE).ok);
  assert(!cleanRevision(body({ trip: { ...body().trip, link: "https://evil.example/#/build/x" } }), SITE).ok);
  assert(!cleanRevision({}, SITE).ok);
  const messy = cleanRevision(body({ changes: Array.from({ length: 30 }, (_, i) => "c" + i), note: "n".repeat(5000), trip: { ...body().trip, start: "tomorrow", stops: Array(100).fill("x") } }), SITE);
  assert(messy.ok);
  if (messy.ok) { assertEquals(messy.changes.length, 8); assertEquals(messy.note.length, 1000); assertEquals(messy.f.start, null); assertEquals(messy.f.stops.length, 40); }
  const noSum = cleanRevision(body({ summary: "nope" }), SITE); assert(noSum.ok && noSum.summary === null);
});

Deno.test("a changed trip replaces the old one on the same request and is counted", () => {
  const r = revisionPatch(row(), clean(), "2026-10-23T10:00:00Z");
  assert(!r.unchanged); assertEquals(r.rev, 1); assertEquals(r.nextStatus, "submitted"); assertEquals(r.withdrawn, false);
  assertEquals(r.patch.route, "Hanoi → Hoi An"); assertEquals(r.patch.days, 9); assertEquals(r.patch.est_total_usd, 480.5); assertEquals(r.patch.start_date, "2027-02-10");
  assertEquals(r.patch.itinerary, "CREW TEXT"); assertEquals(r.patch.status, "submitted");
  assert(!("balance_amount" in r.patch));
  const p = r.patch.payload as Record<string, unknown>;
  assertEquals(p.rev, 1); assertEquals(p.guestNote, "swapped Saigon for Hoi An");
  assert(!("original" in p) && !("revision" in p), "a crew edit is replaced by the guest's new version");
  assertEquals((p.summary as { headline: string }).headline, "x");
  const h = (p.history as Record<string, unknown>[])[0];
  assertEquals(h.was, { route: "Hanoi → Saigon", days: 10, estTotalUsd: 500, start: "2027-02-10", link: row().trip_link });
  assertEquals(h.from_status, "submitted");
});

Deno.test("revisions are numbered, and the history keeps the last ten", () => {
  let cur: Record<string, unknown> = row();
  for (let i = 0; i < 12; i++) {
    const c = clean(body({ trip: { ...body().trip, link: LINK + "&n=" + i }, note: "n" + i }));
    const r = revisionPatch(cur as never, c, "2026-10-23T10:00:00Z");
    assertEquals(r.rev, i + 1); cur = { ...cur, ...r.patch };
  }
  const p = cur.payload as Record<string, unknown>;
  assertEquals(currentRev(p), 12); assertEquals((p.history as unknown[]).length, 10);
  assertEquals(lastRevision(p)?.rev, 12); assertEquals(lastRevision(p)?.note, "n11");
});

Deno.test("sending the same trip again changes nothing (so no second email)", () => {
  const same = revisionPatch(row({ trip_link: LINK }), clean(body({ note: "" })), "2026-10-23T10:00:00Z");
  assert(same.unchanged); assertEquals(same.patch, {});
});

Deno.test("changing a trip the crew has approved withdraws the approval and the price", () => {
  const ready = row({ status: "ready", balance_amount: 450, balance_url: "https://x", pay_plan: "later", pay_schedule: [{ n: 1 }], crew_note: "All checked" });
  const r = revisionPatch(ready, clean(), "2026-10-23T10:00:00Z");
  assert(r.withdrawn); assertEquals(r.nextStatus, "checking"); assertEquals(r.patch.status, "checking");
  assertEquals(r.patch.balance_amount, null); assertEquals(r.patch.balance_url, null); assertEquals(r.patch.balance_session_id, null);
  assertEquals(r.patch.pay_plan, null); assertEquals(r.patch.pay_schedule, []); assertEquals(r.patch.crew_note, null);
  assertEquals(lastRevision(r.patch.payload)?.wasStatus, "ready");
});

Deno.test("an unpaid or already-checking trip keeps its status", () => {
  for (const s of ["pending_payment", "submitted", "checking"]) assertEquals(revisionPatch(row({ status: s }), clean(), "t").patch.status, s);
});

Deno.test("the old itinerary text survives a revision that sends none", () => {
  const r = revisionPatch(row(), clean(body({ crewText: "", itinerary: "" })), "t");
  assertEquals(r.patch.itinerary, "old");
});

Deno.test("the crew sees the guest's latest revision, and nothing for a trip nobody has changed", () => {
  assertEquals(lastRevision({}), null); assertEquals(lastRevision(null), null);
  assertEquals(lastRevision({ history: [{ rev: 1, by: "crew" }] }), null);
  assertEquals(currentRev({}), 0); assertEquals(currentRev(undefined), 0);
});
