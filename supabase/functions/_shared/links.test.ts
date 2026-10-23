import { assert, assertEquals } from "jsr:@std/assert@1";
import { safeHref } from "./email.ts";
import { safeEqual } from "./admin-auth.ts";

Deno.test("safeHref: plain http(s) links come through, anything else is left out", () => {
  assertEquals(safeHref("https://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/i=s.hanoi.4"), "https://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/i=s.hanoi.4");
  assertEquals(safeHref("  http://localhost:8080/x  "), "http://localhost:8080/x");
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "//evil.example", "https://x.test/a b", 'https://x.test/"onmouseover="alert(1)', "https://x.test/<b>", "", "   ", null, undefined, 42, {}]) {
    assertEquals(safeHref(bad), "", String(bad));
  }
});

Deno.test("safeEqual: the same string, and only the same string", () => {
  assert(safeEqual("correct horse", "correct horse"));
  assert(!safeEqual("correct horse", "correct horsf"));
  assert(!safeEqual("correct horse", "correct hors"));
  assert(!safeEqual("", "x"));
  assert(safeEqual("", ""));
  assert(!safeEqual("pässword", "password"));
});
