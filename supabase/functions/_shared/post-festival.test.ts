import { assert, assertEquals } from "jsr:@std/assert@1";
import { SALE_START_MS, saleOffPerSpot } from "./black-friday.ts";
import { countryForSlug, opsCcForTrip } from "./email.ts";
import { tripCountryFromSlug, tripFinalDetails } from "./trip-details.ts";

// The Koh Rong Ultimate Party Package (migrations 20261110090000 +
// 20261127090000). Its slug still starts "cambodia-" because these all read
// the country from the slug.
const SLUG = "cambodia-post-festival";
const NAME = "Koh Rong Ultimate Party Package";

Deno.test("guests read Cambodia, and the Cambodia team are copied in", () => {
  assertEquals(countryForSlug(SLUG), "Cambodia");
  assertEquals(tripCountryFromSlug(SLUG), "Cambodia");
  assertEquals(opsCcForTrip(NAME, SLUG).sort(), opsCcForTrip("ALL IN · Cambodia", "cambodia").sort());
});

Deno.test("its 7-day email has its own details and the Koh Rong chat", () => {
  const d = tripFinalDetails(SLUG);
  assert(d.finalDetailsHtml.includes(NAME));
  assert(d.whatsappUrl.startsWith("https://chat.whatsapp.com/"));
  assert(!d.finalDetailsHtml.includes("Phnom Penh"));
});

Deno.test("it runs every week now: no festival, no Koh Sdach transfer, no December dates", () => {
  const html = tripFinalDetails(SLUG).finalDetailsHtml;
  assert(!/festival/i.test(html), "no festival");
  assert(!/Koh Sdach/i.test(html), "no transfer from Koh Sdach");
  assert(!/\bDec\b|December|\b1[6-9] |\b2[01] /.test(html), "no December dates");
  assert(html.includes("Soundgarden"));
  assert(html.includes("free drink every night at the Meet Up"));
});

Deno.test("it isn't in the Black Friday sale", () => {
  assertEquals(saleOffPerSpot(SLUG, SALE_START_MS + 3_600_000, null, "2026-12-16"), 0);
  assertEquals(saleOffPerSpot(SLUG, SALE_START_MS + 3_600_000, null, "2027-01-06"), 0);
});
