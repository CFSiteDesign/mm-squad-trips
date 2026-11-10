import { assert, assertEquals } from "jsr:@std/assert@1";
import { SALE_START_MS, saleOffPerSpot } from "./black-friday.ts";
import { countryForSlug, opsCcForTrip } from "./email.ts";
import { tripCountryFromSlug, tripFinalDetails } from "./trip-details.ts";

// The Koh Rong post-festival package (migration 20261110090000). Its slug
// starts "cambodia-" because these all read the country from the slug.
const SLUG = "cambodia-post-festival";
const NAME = "Koh Rong Post-Festival Package";

Deno.test("guests read Cambodia, and the Cambodia team are copied in", () => {
  assertEquals(countryForSlug(SLUG), "Cambodia");
  assertEquals(tripCountryFromSlug(SLUG), "Cambodia");
  assertEquals(opsCcForTrip(NAME, SLUG).sort(), opsCcForTrip("ALL IN · Cambodia", "cambodia").sort());
});

Deno.test("its 7-day email has its own details and the Koh Rong chat", () => {
  const d = tripFinalDetails(SLUG);
  assert(d.finalDetailsHtml.includes("Koh Rong Post-Festival Package"));
  assert(d.whatsappUrl.startsWith("https://chat.whatsapp.com/"));
  assert(!d.finalDetailsHtml.includes("Phnom Penh"));
});

Deno.test("it isn't in the Black Friday sale", () => {
  assertEquals(saleOffPerSpot(SLUG, SALE_START_MS + 3_600_000, null, "2026-12-16"), 0);
});
