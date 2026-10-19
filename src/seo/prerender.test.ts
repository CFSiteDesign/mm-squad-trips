import { describe, expect, it } from "vitest";
import { llmsTxt, prerenderPages, sitemapXml } from "./prerender";

const pages = prerenderPages();
const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /\w/.test(w)).length;

describe("prerendered ALL IN pages", () => {
  it("covers home and every trip", () => {
    expect(pages.map((p) => p.file).sort()).toEqual(
      ["index.html", "cambodia/index.html", "indonesia/index.html", "indonesia-7/index.html", "laos/index.html", "thailand/index.html", "vietnam/index.html", "vietnam-7/index.html"].sort(),
    );
  });

  it("gives every indexable page one h1, real text and parseable schema", () => {
    for (const p of pages.filter((x) => !x.noindex)) {
      expect(p.body.match(/<h1[\s>]/g)?.length, p.file).toBe(1);
      // The AI Visibility Audit calls under 400 words thin.
      expect(words(p.body), p.file).toBeGreaterThan(400);
      expect(() => JSON.parse(JSON.stringify(p.jsonLd))).not.toThrow();
      expect(p.url.startsWith("https://madmonkeyhostels.com/all-in-trips"), p.file).toBe(true);
    }
  });

  it("publishes Laos like every other trip (15 Oct 2026 specs)", () => {
    const sitemap = sitemapXml(pages, "2026-01-01");
    const home = pages.find((p) => p.file === "index.html")!.body;
    const page = pages.find((p) => p.file === "laos/index.html")!;
    expect(page.noindex).toBe(false);
    expect(page.jsonLd).not.toBeNull();
    expect(sitemap).toContain("/all-in-trips/laos<");
    expect(llmsTxt()).toContain("/all-in-trips/laos)");
    expect(home).toContain('/all-in-trips/laos"');
    // Each trip page links to the other trips, Laos included.
    expect(pages.find((p) => p.file === "cambodia/index.html")!.body).toContain("Laos Ultimate");
  });

  it("keeps link-only Thailand out of search and off the home page (19 Oct 2026)", () => {
    const th = pages.find((p) => p.file === "thailand/index.html")!;
    expect(th.noindex).toBe(true);
    expect(th.jsonLd).toBeNull();
    expect(sitemapXml(pages, "2026-01-01")).not.toContain("thailand");
    expect(llmsTxt()).not.toContain("thailand");
    expect(pages.find((p) => p.file === "index.html")!.body).not.toContain("/thailand");
    expect(pages.find((p) => p.file === "cambodia/index.html")!.body).not.toContain("/thailand");
  });

  it("reads YOUR TRIP, SORTED. with its spaces, not YOURTRIP,SORTED.", () => {
    const text = pages.find((p) => p.file === "laos/index.html")!.body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    expect(text).toContain("YOUR TRIP, SORTED.");
    expect(text).not.toContain("YOURTRIP");
  });

  it("gives Laos its add-ons, good to know and Sunday departures, and no free drinks", () => {
    const body = pages.find((p) => p.file === "laos/index.html")!.body;
    expect(body).toContain("WANT TO GO BIGGER?");
    expect(body).toContain("Hot air balloon ride (+$110)");
    expect(body).toContain("Ask us online or at the hostel for times and booking.");
    expect(body).toContain("GOOD TO KNOW");
    expect(body).toContain("Every Sunday");
    expect(body).toContain("LAOS10");
    expect(body.toLowerCase()).not.toContain("free drinks");
    // Two of the nine nights are a camp and a homestay: never "Mad Monkey beds every night".
    expect(body).not.toMatch(/(beds|Mad Monkey)[^.]*every night/i);
    const th = pages.find((p) => p.file === "thailand/index.html")!.body;
    expect(th).toContain("Every Tuesday");
    expect(th.toLowerCase()).not.toContain("free drinks");
    expect(th).not.toContain("payment link");
  });
});
