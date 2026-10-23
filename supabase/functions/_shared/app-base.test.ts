import { assert, assertEquals } from "jsr:@std/assert@1";
import { appBase, isTrustedOrigin, trustedBase } from "./app-base.ts";

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

const LIVE = "https://madmonkeyhostels.com/all-in-trips";

Deno.test("trustedBase: our own sites keep their address", () => {
  assertEquals(trustedBase("https://madmonkeyhostels.com"), LIVE);
  assertEquals(trustedBase("https://www.madmonkeyhostels.com"), "https://www.madmonkeyhostels.com/all-in-trips");
  assertEquals(trustedBase("https://mm-squad-trips.lovable.app"), "https://mm-squad-trips.lovable.app");
  assertEquals(trustedBase("http://localhost:8080"), "http://localhost:8080");
  assertEquals(trustedBase("http://127.0.0.1:5173"), "http://127.0.0.1:5173");
});

Deno.test("trustedBase: anyone else's address, however it is dressed up, becomes the live site", () => {
  for (const o of [
    "https://evil.example", "https://evilmadmonkeyhostels.com", "https://madmonkeyhostels.com.evil.example", "https://evil.example/madmonkeyhostels.com",
    "http://madmonkeyhostels.com", "https://other.lovable.app", "https://lovable.app", "javascript:alert(1)", "data:text/html,hi", "ftp://madmonkeyhostels.com",
    "https://madmonkeyhostels.com@evil.example", "not a url", "", null, undefined,
  ]) assertEquals(trustedBase(o), LIVE, String(o));
});

Deno.test("trustedBase: extra sites are added with TRIP_BUILDER_ALLOWED_ORIGINS, never by default", () => {
  assertEquals(trustedBase("https://staging.example.com"), LIVE);
  assertEquals(trustedBase("https://staging.example.com", "staging.example.com"), "https://staging.example.com");
  assertEquals(trustedBase("https://a.preview.example.com", "*.preview.example.com, other.test"), "https://a.preview.example.com");
  assertEquals(trustedBase("https://preview.example.com", "*.preview.example.com"), LIVE);          // the wildcard is for subdomains
  assertEquals(trustedBase("https://evilpreview.example.com", "*.preview.example.com"), LIVE);
  assert(!isTrustedOrigin("https://evil.example", ""));
});
