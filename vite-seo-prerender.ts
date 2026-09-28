// After `vite build`, writes a crawlable copy of every ALL IN content route:
// dist/index.html (home) and dist/<slug>/index.html (trip pages), each with
// its own title, description, canonical, JSON-LD and the page's real text
// inside #root, plus dist/sitemap.xml and dist/llms.txt. The hosting serves
// dist/<slug>/index.html for /<slug> (checked 28 Sep 2026 with public/map),
// on both mm-squad-trips.lovable.app and madmonkeyhostels.com/all-in-trips.
//
// Content comes from src/seo/prerender.ts, loaded through a throwaway Vite
// SSR server so it can import the same data modules the pages use.
// Anything that goes wrong here logs and leaves the normal build untouched:
// SEO must never be able to break a deploy.
import fs from "node:fs";
import path from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";

type Page = {
  file: string;
  url: string;
  title: string;
  description: string;
  noindex: boolean;
  jsonLd: Record<string, unknown> | null;
  body: string;
};

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const text = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Root index.html is also the SPA fallback for /checkout, /admin, /squad-leader
// and the rest. Those routes have nothing to do with the home copy, so on them
// the copy is hidden before first paint. Crawlers without JavaScript still read
// it, and those routes carry noindex once the app runs.
const APP_ROUTE_GUARD = `<script>(function(){var p=location.pathname.replace(/\\/+$/,"").replace(/\\/index\\.html$/,"");if(p!==""&&p!=="/all-in-trips")document.documentElement.setAttribute("data-app-route","")})()</script><style>html[data-app-route] #seo-fallback{display:none}</style>`;

function applyPage(template: string, p: Page, isRoot: boolean): string {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${text(p.title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${attr(p.description)}">`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${attr(p.title)}">`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${attr(p.title)}">`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${attr(p.description)}">`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${attr(p.description)}">`)
    .replace(/<link\s+rel="canonical"[^>]*>/g, "");

  const head = [
    `<link rel="canonical" href="${attr(p.url)}">`,
    `<meta property="og:url" content="${attr(p.url)}">`,
    p.noindex ? `<meta name="robots" content="noindex, nofollow">` : "",
    p.jsonLd ? `<script type="application/ld+json">${JSON.stringify(p.jsonLd).replace(/</g, "\\u003c")}</script>` : "",
    isRoot ? APP_ROUTE_GUARD : "",
  ].filter(Boolean).join("\n    ");

  html = html.replace("</head>", `    ${head}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error("no empty #root in dist/index.html");
  return html.replace('<div id="root"></div>', `<div id="root">${p.body}</div>`);
}

export function seoPrerender(): Plugin {
  let root = process.cwd();
  let outDir = path.join(root, "dist");
  return {
    name: "allin-seo-prerender",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      let server: ViteDevServer | undefined;
      try {
        server = await createServer({
          configFile: false,
          root,
          logLevel: "error",
          appType: "custom",
          resolve: { alias: { "@": path.resolve(root, "src") } },
          server: { middlewareMode: true, hmr: false },
          optimizeDeps: { noDiscovery: true, include: [] },
        });
        const mod = await server.ssrLoadModule("/src/seo/prerender.ts");
        const pages = mod.prerenderPages() as Page[];
        const template = fs.readFileSync(indexPath, "utf8");
        for (const p of pages) {
          const out = path.join(outDir, p.file);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, applyPage(template, p, p.file === "index.html"));
        }
        const today = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(path.join(outDir, "sitemap.xml"), mod.sitemapXml(pages, today));
        fs.writeFileSync(path.join(outDir, "llms.txt"), mod.llmsTxt());
        console.log(`[seo-prerender] wrote ${pages.length} pages, sitemap.xml, llms.txt`);
      } catch (e) {
        console.warn("[seo-prerender] skipped, build left as is:", e instanceof Error ? e.message : e);
      } finally {
        await server?.close();
      }
    },
  };
}
