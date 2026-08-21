// /preview-<slug> — the rebuilt trip page from the Aug 2026 brief, modelled on
// the G Adventures layout. Reads real trip data and reuses the real booking
// flow, so approving this demo means shipping it is a routing change.
//
// One component for all five trips. Indonesia carries the full brief copy;
// the others fall back to database content and show explicit "pending" tiles
// for anything not yet supplied.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, ChevronDown, Star, ArrowRight } from "lucide-react";
import { fetchTrip } from "@/lib/api";
import { getTripFallback } from "@/data/tripFallbacks";
import { formatPrice } from "@/lib/trip-helpers";
import { Navbar } from "@/components/Navbar";
import { BookingFlow } from "@/components/trip/BookingFlow";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { Starburst } from "@/components/brand/Sticker";
import { SubNav, StickyCta, PhotoPending, PendingPanel, SCROLL_OFFSET } from "@/components/preview/PreviewChrome";
import { getPreviewContent, PREVIEW_SLUGS, type PreviewSlug } from "@/data/preview-content";
import { useParams } from "react-router-dom";
import { TRIPS } from "@/data/trips";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";

const SECTIONS = [
  { id: "overview", label: "OVERVIEW" },
  { id: "itinerary", label: "ITINERARY" },
  { id: "included", label: "WHAT'S INCLUDED" },
  { id: "booking", label: "DATES & PRICES" },
  { id: "faq", label: "FAQ" },
];

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET, behavior: "smooth" });
};

function H({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-sticker text-[11px] tracking-[0.16em] text-mm-black/60">{eyebrow}</p>
      <h2 className="mt-1 font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">{children}</h2>
    </div>
  );
}

export default function PreviewTrip({ slug: slugProp }: { slug?: PreviewSlug }) {
  const params = useParams();
  const slug = (slugProp ?? params.slug ?? "indonesia") as PreviewSlug;
  const [showAllIncluded, setShowAllIncluded] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: trip } = useQuery({
    queryKey: ["trip", slug],
    queryFn: () => fetchTrip(slug),
    retry: false,
    placeholderData: getTripFallback(slug),
  });

  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  const content = trip ? getPreviewContent(trip, slug) : null;
  const meta = TRIPS.find((t) => t.slug === slug);
  const price = trip?.departures?.[0]?.price ?? trip?.defaultPrice ?? meta?.price ?? 0;
  const strike = trip?.departures?.[0]?.strikethrough ?? trip?.defaultStrikethrough ?? null;
  const next = trip?.departures?.[0];
  const pctOff = strike && strike > price ? Math.round(((strike - price) / strike) * 100) : null;
  const visibleIncluded = showAllIncluded ? (content?.included ?? []) : (content?.included ?? []).slice(0, 6);

  if (!content) return <div className="min-h-screen bg-mm-bone" />;
  const { snapshot: SNAPSHOT, isThisForMe: IS_THIS_FOR_ME, highlights: HIGHLIGHTS,
          notIncluded: NOT_INCLUDED, itinerary: ITINERARY, reviews: REVIEWS,
          faqs: FAQS, hero: heroImg } = content;

  return (
    <div className="min-h-screen bg-mm-bone pb-24 md:pb-0">
      <Navbar />

      {/* ============ HERO ============ */}
      {/* Mirrors the live trip hero (Hero.tsx): min-h-[100svh], same type scale,
          eyebrow, day starburst, padding and left offset. What differs is the
          brief's image treatment (photo masked to fade left, black overlay cut
          right back) and the brief's CTA pair. */}
      <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">

        {/* MOBILE */}
        <div className="relative w-full md:hidden">
          <div className="absolute inset-0 z-0">
            {heroImg ? (
              <>
                <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
                <div className="absolute inset-0 bg-gradient-to-b from-mm-black/55 via-mm-black/15 to-mm-black/80" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-mm-black">
                <span className="font-sticker text-[10px] tracking-[0.16em] text-mm-bone/40">HERO IMAGE PENDING</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute right-3 top-[5rem] z-30">
            <Starburst size={92} color="pink" rotate={-12}>{SNAPSHOT.days}<br />DAYS</Starburst>
          </div>

          <div className="relative z-10 flex flex-col px-5 pt-[9rem] pb-24">
            <p className="mb-2 font-display text-2xl tracking-[0.12em] text-mm-lime">
              {(meta?.name ?? trip?.name ?? "").toUpperCase()}
            </p>
            <h1 className="font-display text-[clamp(2.75rem,13vw,4.25rem)] leading-[0.9] text-mm-bone">
              <span className="block">YOUR GROUP</span>
              <span className="block whitespace-nowrap text-mm-pink">TRIP,</span>
              <span className="block text-mm-lime">SORTED.</span>
            </h1>
            <p className="mt-5 max-w-[280px] text-[14px] leading-snug text-mm-bone/85">
              {SNAPSHOT.from} → {SNAPSHOT.to} · {SNAPSHOT.days} days · from {formatPrice(price)} · $99 holds your spot
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={() => scrollToId("booking")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone">
                RESERVE FOR $99 <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => scrollToId("booking")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-bone">
                SEE ALL DATES
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="relative hidden min-h-[100svh] w-full md:block">
          <div className="absolute inset-0 z-0">
            {heroImg ? (
              <>
                <div className="absolute inset-y-0 right-0 w-[72%]">
                  <img
                    src={heroImg}
                    alt=""
                    className="h-full w-full object-cover object-[58%_40%]"
                    style={{
                      WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.85) 36%, #000 55%)",
                      maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.85) 36%, #000 55%)",
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.32)_30%,rgba(0,0,0,0.06)_55%,transparent_72%)]" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-mm-black">
                <span className="font-sticker text-[11px] tracking-[0.16em] text-mm-bone/40">HERO IMAGE PENDING</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute right-8 top-20 z-20 origin-top-right scale-[0.78] lg:right-16 lg:top-20 lg:scale-100">
            <Starburst size={180} color="pink" rotate={-12} textClassName="text-2xl">
              {SNAPSHOT.days}<br />DAYS
            </Starburst>
          </div>

          <div className="relative z-10 mr-auto flex min-h-[100svh] max-w-6xl flex-col justify-between px-8 pt-24 pb-16 md:pt-40 md:pb-16 lg:pl-20">
            <div>
              <p className="mb-3 font-display text-3xl tracking-[0.12em] text-mm-lime lg:text-5xl">
                {(meta?.name ?? trip?.name ?? "").toUpperCase()}
              </p>
              <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-[0.88] text-mm-bone">
                <span className="block">YOUR GROUP</span>
                <span className="block whitespace-nowrap text-mm-pink">TRIP,</span>
                <span className="block text-mm-lime">SORTED.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-snug text-mm-bone/85">
                {SNAPSHOT.from} → {SNAPSHOT.to} · {SNAPSHOT.days} days · from {formatPrice(price)} · $99 deposit holds your spot
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button onClick={() => scrollToId("booking")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px]">
                  RESERVE FOR $99 <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => scrollToId("booking")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-bone hover:bg-mm-bone hover:text-mm-black">
                  SEE ALL DATES
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SubNav sections={SECTIONS} />

      {/* ============ BODY + FLOATING CARD ============ */}
      <div className="mx-auto max-w-6xl gap-8 px-5 py-12 md:px-6 lg:flex lg:items-start">
        <div className="min-w-0 flex-1">

          {/* Overview */}
          <section id="overview" className="scroll-mt-[116px]">
            <H eyebrow="TOUR OVERVIEW">YOUR ADVENTURE<br />SNAPSHOT</H>
            <dl className="mb-6 grid grid-cols-2 gap-px border-[3px] border-mm-black bg-mm-black sm:grid-cols-5">
              {[["TRIP CODE", SNAPSHOT.tripCode], ["DAYS", String(SNAPSHOT.days)], ["FROM", SNAPSHOT.from], ["TO", SNAPSHOT.to], ["COUNTRIES", SNAPSHOT.countries]].map(([k, v]) => (
                <div key={k} className="bg-mm-bone p-3">
                  <dt className="font-sticker text-[9px] tracking-[0.14em] text-mm-black/55">{k}</dt>
                  <dd className="mt-1 font-display text-base leading-tight text-mm-black">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="max-w-2xl text-[15px] leading-relaxed text-mm-black/80">{SNAPSHOT.blurb}</p>

            <h3 className="mt-10 font-display text-2xl text-mm-black">IS THIS TRIP FOR ME?</h3>
            <div className="mt-4 grid gap-px border-[3px] border-mm-black bg-mm-black sm:grid-cols-2">
              {IS_THIS_FOR_ME.map((r) => (
                <div key={r.k} className="bg-mm-bone p-4">
                  <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/55">{r.k.toUpperCase()}</p>
                  <p className="mt-1 text-[15px] font-semibold text-mm-black">{r.v}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Highlights */}
          <section className="mt-16">
            <H eyebrow="TOUR HIGHLIGHTS">BUCKET-LIST MOMENTS<br />MADE FOR THE GROUP CHAT</H>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <figure key={h.title} className="border-[3px] border-mm-black bg-mm-bone shadow-mm-sm">
                  <div className="relative">
                    {h.image ? (
                      <img src={h.image} alt={h.title} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                    ) : (
                      <PhotoPending title={h.title} />
                    )}
                    <span className="absolute left-2 top-2 border-[2px] border-mm-black bg-mm-lime px-2 py-1 font-sticker text-[9px] tracking-[0.12em] text-mm-black">
                      INCLUDED
                    </span>
                  </div>
                  <figcaption className="border-t-[3px] border-mm-black p-3 font-display text-base leading-tight text-mm-black">
                    {h.title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* What's included */}
          <section id="included" className="mt-16 scroll-mt-[116px]">
            <H eyebrow="WHAT'S INCLUDED">WHAT YOUR $99<br />DEPOSIT UNLOCKS</H>
            <div className="grid gap-px border-[3px] border-mm-black bg-mm-black sm:grid-cols-2">
              {visibleIncluded.map((i) => (
                <div key={i} className="flex items-start gap-2 bg-mm-bone p-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mm-black" strokeWidth={3} />
                  <span className="text-sm text-mm-black">{i}</span>
                </div>
              ))}
            </div>
            {content.included.length > 6 && (
              <button onClick={() => setShowAllIncluded((v) => !v)} className="mt-3 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-bone px-4 py-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
                {showAllIncluded ? "SHOW LESS" : "SEE ALL"}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllIncluded ? "rotate-180" : ""}`} />
              </button>
            )}
            <h3 className="mt-8 font-display text-xl text-mm-black">NOT INCLUDED</h3>
            <div className="mt-3 grid gap-px border-[3px] border-mm-black bg-mm-black sm:grid-cols-2">
              {NOT_INCLUDED.map((i) => (
                <div key={i} className="flex items-start gap-2 bg-mm-bone p-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-mm-pink" strokeWidth={3} />
                  <span className="text-sm text-mm-black/70">{i}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Itinerary */}
          <section id="itinerary" className="mt-16 scroll-mt-[116px]">
            <H eyebrow="THE STORY OF YOUR TRIP">THE<br />BREAKDOWN</H>
            <div className="mb-4 flex items-center justify-center border-[3px] border-dashed border-mm-black/40 bg-mm-black/5 p-6 text-center">
              <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">ROUTE MAP PENDING</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {ITINERARY.map((d) => (
                <article key={d.label} className="border-[3px] border-mm-black bg-mm-bone p-4 shadow-mm-sm">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="border-[2px] border-mm-black bg-mm-pink px-2 py-1 font-sticker text-[9px] tracking-[0.12em] text-mm-black">{d.label}</span>
                    <span className="font-display text-base text-mm-black">{d.place}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-mm-black/80">{d.body}</p>
                  <ul className="mt-3 space-y-1 text-xs text-mm-black/70">
                    {d.transport && <li><strong className="font-sticker text-[9px] tracking-[0.1em]">TRANSPORT</strong> · {d.transport}</li>}
                    {d.activities && <li><strong className="font-sticker text-[9px] tracking-[0.1em]">INCLUDED</strong> · {d.activities}</li>}
                    {d.meals && <li><strong className="font-sticker text-[9px] tracking-[0.1em]">MEALS</strong> · {d.meals}</li>}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="mt-16">
            <H eyebrow="REVIEWS FROM OUR TRAVELS">DON'T TAKE<br />OUR WORD FOR IT</H>
            {REVIEWS.length === 0 && <PendingPanel label="Property reviews pending" />}
            <div className="grid gap-4 sm:grid-cols-2">
              {REVIEWS.map((r) => (
                <blockquote key={r.property} className="border-[3px] border-mm-black bg-mm-bone p-4 shadow-mm-sm">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-mm-yellow text-mm-black" strokeWidth={2} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-mm-black/80">{r.body}</p>
                  <footer className="mt-3 border-t-[2px] border-mm-black/15 pt-2 text-xs text-mm-black/60">
                    <span className="font-semibold text-mm-black">{r.author ?? "Google review"}</span>
                    {r.when ? ` · ${r.when}` : ""} · {r.property}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        </div>

        {/* ============ DESKTOP FLOATING CARD ============ */}
        {/* Sticky must sit on the flex item itself. Nested inside the aside it
            never moves, because with items-start the aside is only as tall as
            the card and there is no room to travel. On the aside, the
            containing block is the tall flex row, so it tracks the scroll and
            releases at the end of that row, which is the countdown section. */}
        <aside className="hidden w-[300px] shrink-0 lg:sticky lg:top-[132px] lg:block">
          <div className="border-[3px] border-mm-black bg-mm-bone p-4 shadow-mm-lg">
            {pctOff && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-mm-black/50 line-through">Reg. {formatPrice(strike!)}</span>
                <span className="border-[2px] border-mm-black bg-mm-pink px-2 py-0.5 font-sticker text-[9px] text-mm-black">{pctOff}% OFF</span>
              </div>
            )}
            <p className="font-display text-3xl leading-none text-mm-black">
              <span className="text-sm font-normal">From </span>{formatPrice(price)}
            </p>
            <p className="text-xs text-mm-black/60">per person</p>
            <div className="mt-3 grid grid-cols-2 gap-px border-[3px] border-mm-black bg-mm-black">
              <div className="bg-mm-bone p-2">
                <p className="font-sticker text-[9px] tracking-[0.12em] text-mm-black/55">NEXT DATE</p>
                <p className="text-sm font-semibold text-mm-black">
                  {next ? new Date(next.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBC"}
                </p>
              </div>
              <div className="bg-mm-bone p-2">
                <p className="font-sticker text-[9px] tracking-[0.12em] text-mm-black/55">DURATION</p>
                <p className="text-sm font-semibold text-mm-black">{SNAPSHOT.days} days</p>
              </div>
            </div>
            <button onClick={() => scrollToId("booking")} className="mt-3 w-full border-[3px] border-mm-black bg-mm-pink px-4 py-3 font-sticker text-[11px] tracking-[0.14em] text-mm-black shadow-mm-sm">
              RESERVE FOR $99
            </button>
            <button onClick={() => scrollToId("booking")} className="mt-2 w-full border-[3px] border-mm-black bg-mm-bone px-4 py-2.5 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
              SEE ALL DATES
            </button>
            <div className="mt-3 border-[3px] border-mm-black bg-mm-lime p-2">
              <p className="font-sticker text-[9px] tracking-[0.12em] text-mm-black">SOLO? YOU'RE COVERED</p>
              <p className="mt-1 text-[11px] leading-snug text-mm-black/80">Easy single booking, 100% departure rate, zero fuss.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* ============ DATES & BOOKING (real flow) ============ */}
      <section id="booking" className="scroll-mt-[116px] border-t-[4px] border-mm-black bg-mm-paper py-12">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <H eyebrow="DATES & AVAILABILITY">THE COUNTDOWN<br />STARTS NOW</H>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="border-[3px] border-mm-black bg-mm-lime p-4 shadow-mm-sm">
              <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">✔ SOLO TRAVELLER? YOU'RE COVERED</p>
              <p className="mt-2 text-sm leading-snug text-mm-black/80">Lock in your spot with total peace of mind. Easy single booking, 100% departure rate, and zero fuss. Just show up and experience all the best bits.</p>
            </div>
            <div className="border-[3px] border-mm-black bg-mm-cyan p-4 shadow-mm-sm">
              <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">
                ✔ {SQUAD_BENEFITS.free.headline} — {SQUAD_BENEFITS.free.subhead}
              </p>
              <p className="mt-2 text-sm leading-snug text-mm-black/80">{SQUAD_BENEFITS.free.body}</p>
              <p className="mt-2 text-sm leading-snug text-mm-black/80">
                <strong>{SQUAD_BENEFITS.half.headline} — {SQUAD_BENEFITS.half.subhead}.</strong> {SQUAD_BENEFITS.half.body}
              </p>
            </div>
          </div>
        </div>
        {trip && <BookingFlow trip={trip} />}
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="scroll-mt-[116px] border-t-[4px] border-mm-black bg-mm-bone py-12">
        <div className="mx-auto max-w-3xl px-5 md:px-6">
          <H eyebrow="BEFORE YOU ASK">FAQ.</H>
          <div className="border-[3px] border-mm-black">
            {FAQS.map((f, i) => (
              <div key={f.q} className={i > 0 ? "border-t-[3px] border-mm-black" : ""}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-3 bg-mm-bone p-4 text-left">
                  <span className="font-display text-base leading-tight text-mm-black">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <p className="border-t-[2px] border-mm-black/15 bg-mm-paper p-4 text-sm leading-relaxed text-mm-black/80">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {content.pending.length > 0 && (
        <section className="border-t-[4px] border-mm-black bg-mm-paper py-10">
          <div className="mx-auto max-w-3xl px-5 md:px-6">
            <p className="font-sticker text-[11px] tracking-[0.16em] text-mm-black/60">STILL TO COME</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {content.pending.map((p) => (
                <li key={p} className="border-[3px] border-dashed border-mm-black/40 bg-mm-black/5 px-3 py-1.5 text-xs text-mm-black/70">{p}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <SiteFooter />
      <StickyCta onClick={() => scrollToId("booking")} />
    </div>
  );
}
