import { assertEquals } from "jsr:@std/assert@1";
import { appBase } from "./app-base.ts";

Deno.test("live domain gets the /all-in-trips prefix", () => {
  assertEquals(appBase("https://madmonkeyhostels.com"), "https://madmonkeyhostels.com/all-in-trips");
  assertEquals(appBase("https://www.madmonkeyhostels.com"), "https://www.madmonkeyhostels.com/all-in-trips");
});

Deno.test("lovable.app and localhost keep their origin", () => {
  assertEquals(appBase("https://mm-squad-trips.lovable.app"), "https://mm-squad-trips.lovable.app");
  assertEquals(appBase("http://localhost:8080"), "http://localhost:8080");
});

Deno.test("missing or junk origin falls back to the live site", () => {
  assertEquals(appBase(null), "https://madmonkeyhostels.com/all-in-trips");
  assertEquals(appBase(""), "https://madmonkeyhostels.com/all-in-trips");
  assertEquals(appBase("not a url"), "https://madmonkeyhostels.com/all-in-trips");
  assertEquals(appBase("https://evilmadmonkeyhostels.com"), "https://evilmadmonkeyhostels.com");
});
