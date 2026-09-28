// Build-time only (loaded by the seoPrerender plugin in vite.config.ts, never
// by the app). Turns the content the pages already render into plain HTML,
// JSON-LD, a sitemap and llms.txt, so crawlers that don't run JavaScript
// (GPTBot, ClaudeBot, PerplexityBot, and Google's first pass) read the real
// page instead of an empty <div id="root">.
//
// The HTML goes inside #root. React's createRoot replaces it on mount, so
// people see the app; the first screen mirrors each page's hero so the swap
// reads as the page loading. Same words as the page, never hidden with CSS:
// hiding it would be cloaking.
import { TRIPS } from "@/data/trips";
import { getTripContent, type TripSlug } from "@/data/trip-content";
import { getTripFallback } from "@/data/tripFallbacks";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";
import { DIFFERENT_CREW, DIFFERENT_INDEPENDENT, HERO_SUB, INCLUDED, NOT_INCLUDED, RATING_LINE } from "@/data/home-content";
import {
  ALLIN_URL, HOME_SEO, LISTED_SLUGS, SITE_ORIGIN, SOCIAL_IMAGE, TRIP_SEO, pageUrl, priceOf, type SeoSlug,
} from "@/seo/site";

export type PrerenderPage = {
  /** Output path inside dist/, e.g. "index.html" or "vietnam/index.html". */
  file: string;
  url: string;
  title: string;
  description: string;
  noindex: boolean;
  jsonLd: Record<string, unknown> | null;
  body: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ORG_ID = `${SITE_ORIGIN}/#organization`;
// Matches the Organization block on madmonkeyhostels.com, so both sites describe one entity.
const ORGANIZATION = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Mad Monkey Hostels",
  url: `${SITE_ORIGIN}/`,
  logo: `${SITE_ORIGIN}/images/favicon/android-chrome-192x192.png`,
};

const crumbs = (trail: { name: string; url: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
});

const tripName = (slug: string) => TRIPS.find((t) => t.slug === slug)?.name ?? slug;

// ---------- markup pieces (Tailwind classes: this file is in the content glob) ----------

const HERO_H1 = "font-display text-[clamp(2.4rem,11.4vw,3.75rem)] leading-[0.9] text-mm-bone md:text-[clamp(3.5rem,10.5vw,7.9rem)] md:leading-[0.88]";
const H2 = "font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black";
const H3 = "mt-6 font-display text-xl leading-tight text-mm-black";
const P = "mt-3 max-w-2xl text-[15px] leading-relaxed text-mm-black/80";
const LIST = "mt-3 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-mm-black/80";

const hero = (eyebrow: string | null, lines: [string, string][], sub: string) => `
<section class="border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">
  <div class="mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-center px-5 pb-24 pt-[9rem] md:px-8 md:pb-20 md:pt-32 lg:pl-20">
    ${eyebrow ? `<p class="mb-2 font-display text-2xl tracking-[0.12em] text-mm-lime md:text-3xl lg:text-5xl">${esc(eyebrow)}</p>` : ""}
    <h1 class="${HERO_H1}">${lines.map(([text, cls]) => `<span class="block ${cls}">${esc(text)}</span>`).join("")}</h1>
    <p class="mt-5 max-w-xl text-[14px] leading-snug text-mm-bone/85 md:mt-7 md:text-lg">${esc(sub)}</p>
  </div>
</section>`;

const section = (heading: string, inner: string) => `
<section class="border-b-[4px] border-mm-black py-12">
  <div class="mx-auto max-w-4xl px-5 md:px-6">
    <h2 class="${H2}">${esc(heading)}</h2>
    ${inner}
  </div>
</section>`;

const list = (items: string[]) => `<ul class="${LIST}">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
const link = (href: string, text: string) =>
  `<a class="font-bold text-mm-black underline underline-offset-4" href="${esc(href)}">${esc(text)}</a>`;

const wrap = (inner: string) => `<div id="seo-fallback" class="min-h-screen bg-mm-bone text-mm-black">${inner}</div>`;

// ---------- pages ----------

function homePage(): PrerenderPage {
  const cards = LISTED_SLUGS.map((slug) => {
    const meta = TRIPS.find((t) => t.slug === slug)!;
    const content = getTripContent(getTripFallback(slug)!, slug);
    return `
    <article class="mt-8">
      <h3 class="${H3}">${esc(meta.name.toUpperCase())}</h3>
      <p class="mt-1 text-sm text-mm-black/60">${esc(meta.route)}</p>
      <p class="mt-2 font-display text-lg text-mm-black">${meta.days} DAYS · FROM $${meta.price}</p>
      <p class="${P}">${esc(content.snapshot.blurb)}</p>
      <p class="mt-3">${link(pageUrl(slug), "View dates & itinerary")}</p>
    </article>`;
  }).join("");

  const body = wrap(
    hero(null, [["TRIPS THAT", ""], ["MAKE IT OUT", "text-mm-lime"], ["THE GROUP CHAT", "text-mm-pink"]], HERO_SUB.crew) +
    section("What makes us different?", DIFFERENT_CREW.map((d) => `<h3 class="${H3}">${esc(d.title)}</h3><p class="${P}">${esc(d.body)}</p>`).join("")) +
    section("Where's your adventure?", cards) +
    section("Rather go it alone?",
      `<h3 class="${H3}">THE ROUTE'S SORTED. YOU JUST TURN UP.</h3><p class="${P}">${esc(HERO_SUB.independent)}</p>` +
      DIFFERENT_INDEPENDENT.filter((d) => !DIFFERENT_CREW.some((c) => c.title === d.title))
        .map((d) => `<h3 class="${H3}">${esc(d.title)}</h3><p class="${P}">${esc(d.body)}</p>`).join("")) +
    section("What your $99 deposit unlocks",
      `<h3 class="${H3}">WHAT'S IN</h3>${list(INCLUDED)}<h3 class="${H3}">WHAT'S NOT</h3>${list(NOT_INCLUDED)}`) +
    section("Don't take our word for it", `<p class="${P}">${esc(RATING_LINE)}</p>`) +
    section("Travel for free when you bring the crew",
      [SQUAD_BENEFITS.half, SQUAD_BENEFITS.free]
        .map((b) => `<h3 class="${H3}">${esc(b.headline)}: ${esc(b.subhead)}</h3><p class="${P}">${esc(b.body)}</p>`).join("") +
      `<p class="${P}">You rally the group chat, we handle the logistics.</p>`),
  );

  const products = LISTED_SLUGS.map((slug) => tripProduct(slug));
  return {
    file: "index.html",
    url: ALLIN_URL,
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    noindex: false,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        ORGANIZATION,
        {
          "@type": "CollectionPage",
          "@id": `${ALLIN_URL}#page`,
          url: ALLIN_URL,
          name: HOME_SEO.title,
          description: HOME_SEO.description,
          publisher: { "@id": ORG_ID },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: LISTED_SLUGS.map((slug, i) => ({ "@type": "ListItem", position: i + 1, url: pageUrl(slug) })),
          },
        },
        ...products,
        crumbs([{ name: "Mad Monkey Hostels", url: `${SITE_ORIGIN}/` }, { name: "ALL IN Trips", url: ALLIN_URL }]),
      ],
    },
  };
}

function tripProduct(slug: SeoSlug) {
  const meta = TRIPS.find((t) => t.slug === slug)!;
  const content = getTripContent(getTripFallback(slug)!, slug as TripSlug);
  const url = pageUrl(slug);
  return {
    "@type": ["Product", "TouristTrip"],
    "@id": `${url}#trip`,
    name: `${meta.country} ${meta.days}-Day Backpacker Trip: ${content.snapshot.from} to ${content.snapshot.to}`,
    description: content.snapshot.blurb,
    url,
    image: SOCIAL_IMAGE,
    sku: content.snapshot.tripCode,
    brand: { "@type": "Brand", name: "Mad Monkey Hostels" },
    provider: { "@id": ORG_ID },
    touristType: "Backpackers",
    itinerary: {
      "@type": "ItemList",
      itemListElement: content.itinerary.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `${d.label}: ${d.place}` })),
    },
    offers: {
      "@type": "Offer",
      url,
      price: priceOf(slug),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      seller: { "@id": ORG_ID },
    },
  };
}

function tripPage(slug: SeoSlug): PrerenderPage {
  const meta = TRIPS.find((t) => t.slug === slug)!;
  const seo = TRIP_SEO[slug];
  const c = getTripContent(getTripFallback(slug)!, slug as TripSlug);
  const s = c.snapshot;
  const url = pageUrl(slug);

  const days = c.itinerary.map((d) => {
    const extras = [
      d.activities ? `Activities: ${d.activities}` : "",
      d.transport ? `Transport: ${d.transport}` : "",
      d.meals ? `Meals: ${d.meals}` : "",
    ].filter(Boolean);
    return `<h3 class="${H3}">${esc(`${d.label}: ${d.place}`)}</h3><p class="${P}">${esc(d.body)}</p>${extras.map((e) => `<p class="mt-1 text-sm text-mm-black/60">${esc(e)}</p>`).join("")}`;
  }).join("");

  const reviews = c.reviews.length
    ? section("Don't take our word for it", c.reviews.map((r) =>
        `<blockquote class="mt-6"><p class="${P}">${esc(r.body)}</p><p class="mt-1 text-sm text-mm-black/60">${esc([r.author, r.property].filter(Boolean).join(", "))}</p></blockquote>`).join(""))
    : "";

  const others = LISTED_SLUGS.filter((o) => o !== slug);

  const body = wrap(
    hero(meta.name.toUpperCase(), [["YOUR", ""], ["TRIP,", "text-mm-pink"], ["SORTED.", "text-mm-lime"]],
      `${s.from} → ${s.to} · ${s.days} days · from $${priceOf(slug)} · $99 deposit holds your spot`) +
    section("Your adventure snapshot",
      `<dl class="mt-4 grid grid-cols-2 gap-3 text-[15px] sm:grid-cols-5">${[["Trip code", s.tripCode], ["Days", String(s.days)], ["From", s.from], ["To", s.to], ["Countries", s.countries]]
        .map(([k, v]) => `<div><dt class="text-xs uppercase tracking-[0.14em] text-mm-black/55">${esc(k)}</dt><dd class="font-display">${esc(v)}</dd></div>`).join("")}</dl>` +
      `<p class="${P}">${esc(s.blurb)}</p>` +
      `<h3 class="${H3}">IS THIS TRIP FOR ME?</h3>${list(c.isThisForMe.map((r) => `${r.k}: ${r.v}`))}`) +
    (c.highlights.length ? section("Bucket-list moments made for the group chat", list(c.highlights.map((h) => h.title))) : "") +
    section("What your $99 deposit unlocks", `${list(c.included)}<h3 class="${H3}">NOT INCLUDED</h3>${list(c.notIncluded)}`) +
    section("The breakdown", days) +
    reviews +
    section("FAQ", c.faqs.map((f) => `<h3 class="${H3}">${esc(f.q)}</h3><p class="${P}">${esc(f.a)}</p>`).join("")) +
    (seo.noindex ? "" : section("More ALL IN trips",
      `<ul class="${LIST}">${others.map((o) => `<li>${link(pageUrl(o), TRIPS.find((t) => t.slug === o)!.name)}</li>`).join("")}<li>${link(ALLIN_URL, "All ALL IN trips")}</li></ul>`)),
  );

  return {
    file: `${slug}/index.html`,
    url,
    title: seo.title,
    description: seo.description,
    noindex: Boolean(seo.noindex),
    body,
    jsonLd: seo.noindex ? null : {
      "@context": "https://schema.org",
      "@graph": [
        ORGANIZATION,
        tripProduct(slug),
        {
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
        crumbs([
          { name: "Mad Monkey Hostels", url: `${SITE_ORIGIN}/` },
          { name: "ALL IN Trips", url: ALLIN_URL },
          { name: meta.name, url },
        ]),
      ],
    },
  };
}

export function prerenderPages(): PrerenderPage[] {
  const slugs = Object.keys(TRIP_SEO) as SeoSlug[];
  return [homePage(), ...slugs.map(tripPage)];
}

export function sitemapXml(pages: PrerenderPage[], lastmod: string): string {
  const urls = pages.filter((p) => !p.noindex)
    .map((p) => `  <url><loc>${esc(p.url)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** llms.txt (llmstxt.org): what ALL IN is, and which pages to trust. */
export function llmsTxt(): string {
  const trips = LISTED_SLUGS.map((slug) => {
    const meta = TRIPS.find((t) => t.slug === slug)!;
    const { snapshot } = getTripContent(getTripFallback(slug)!, slug);
    return `- [${meta.country} ${meta.days}-day trip](${pageUrl(slug)}): ${snapshot.from} to ${snapshot.to}, ${meta.days} days. From $${meta.price} USD.`;
  }).join("\n");
  return `# Mad Monkey ALL IN Trips

> Small-group backpacker trips through Southeast Asia run by Mad Monkey Hostels. 7 to 14 days, with Mad Monkey hostel beds, transport and the activities in the itinerary included. A $99 deposit per spot holds a place; the balance is charged 7 days before departure.

Travellers book either with a crew (a group departure that runs once 5 people have booked, up to 20) or independently (the same route and beds, guaranteed to run, at their own pace). Crew departures that have not reached 5 travellers 30 days out are cancelled and refunded in full.

## Trips

${trips}

## More

- [All ALL IN trips](${ALLIN_URL})
- [Mad Monkey Hostels](${SITE_ORIGIN}/)
`;
}
