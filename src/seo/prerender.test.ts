import { describe, expect, it } from "vitest";
import { llmsTxt, prerenderPages, sitemapXml } from "./prerender";

const pages = prerenderPages();
const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /\w/.test(w)).length;

describe("prerendered ALL IN pages", () => {
  it("covers home and every trip", () => {
    expect(pages.map((p) => p.file).sort()).toEqual(
      ["index.html", "cambodia/index.html", "indonesia/index.html", "indonesia-7/index.html", "thailand/index.html", "vietnam/index.html", "vietnam-7/index.html"].sort(),
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

  it("keeps link-only Thailand out of search", () => {
    const th = pages.find((p) => p.file === "thailand/index.html")!;
    expect(th.noindex).toBe(true);
    expect(th.jsonLd).toBeNull();
    expect(sitemapXml(pages, "2026-01-01")).not.toContain("thailand");
    expect(llmsTxt()).not.toContain("thailand");
    expect(pages.find((p) => p.file === "index.html")!.body).not.toContain("/thailand");
  });
});
