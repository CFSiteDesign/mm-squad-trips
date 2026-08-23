// /preview-all-in — the rebuilt ALL IN landing page from the Aug 2026 brief.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X, BedDouble, Users, Sparkles, Star } from "lucide-react";
import { fetchTrip } from "@/lib/api";
import { formatPrice } from "@/lib/trip-helpers";
import { TRIPS } from "@/data/trips";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { StickyCta } from "@/components/preview/PreviewChrome";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";
import heroImg from "@/assets/preview-hero-allin.jpg";

const DIFFERENT = [
  { icon: BedDouble, title: "NO MYSTERY DORMS.", body: "Sleep in actual Mad Monkey beds every night." },
  { icon: Users, title: "SOLO? NOT FOR LONG.", body: "Join a crew of 20 like-minded backpackers." },
  { icon: Sparkles, title: "ZERO PLANNING STRESS.", body: "We handle the routes, the boats, and the beds." },
];

const INCLUDED = [
  "All transfers + island boats", "24/7 local crew", "Free pre-trip night",
  "Breakfasts, lunches + dinners", "Loads of free drinks", "Every activity in the itinerary",
  "Dorm beds at Mad Monkey",
];
const NOT_INCLUDED = ["Flights", "Travel insurance", "Personal expenses", "Upgrades + add-ons"];

/** Supplied by the client 21 Aug 2026. Placeholders until real UGC lands. */
const TIKTOKS = {
  feature: "7644404137773239560",
  vertical1: "7637752214735424776",
  vertical2: "7637195070298410247",
};

/** Ceiling on the number shown in the "spots left" badge. */
const SPOTS_FLOOR = 8;

/** DEMO ONLY. Client asked for varied "spots left" numbers so the badges don't
 *  read as templated. These are display values, not real availability, and must
 *  be removed before this goes live. */
const DEMO_SPOTS: Record<string, number> = {
  indonesia: 6, "indonesia-7": 4, vietnam: 8, "vietnam-7": 3, cambodia: 7,
};

/** Live "next departure" badge per trip, read from the real departures table. */
function RouteCard({ slug }: { slug: string }) {
  const meta = TRIPS.find((t) => t.slug === slug);
  const { data: trip } = useQuery({ queryKey: ["trip", slug], queryFn: () => fetchTrip(slug), retry: false });
  const next = trip?.departures?.find((d) => d.bookable);
  const price = trip?.departures?.[0]?.price ?? trip?.defaultPrice ?? meta?.price ?? 0;
  // Client's call: the badge always reads at most SPOTS_FLOOR, so an untouched
  // departure still shows "ONLY 8 SPOTS LEFT". Once genuine availability drops
  // below the floor we show the real number instead, so the badge only ever
  // understates what's left and never oversells a departure.
  const realSpots = next ? Math.min(SPOTS_FLOOR, next.spotsRemaining) : 0;
  // Real availability wins whenever it is genuinely lower than the demo figure.
  const spotsShown = next ? Math.min(DEMO_SPOTS[slug] ?? SPOTS_FLOOR, realSpots || SPOTS_FLOOR) : 0;
  const urgent = next && next.spotsRemaining <= SPOTS_FLOOR;

  return (
    <article className="flex flex-col border-[3px] border-mm-black bg-mm-bone shadow-mm-sm transition-transform duration-200 hover:-translate-y-1.5">
      <div className="flex-1 p-4">
        {next && (
          <span className={`inline-block border-[2px] border-mm-black px-2 py-1 font-sans text-[11px] font-bold tracking-[0.02em] text-mm-black ${urgent ? "bg-mm-orange" : "bg-mm-yellow"}`}>
            {urgent ? "🔥 " : ""}NEXT TRIP: {new Date(next.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
            {` (ONLY ${spotsShown} SPOTS LEFT)`}
          </span>
        )}
        <h3 className="mt-3 font-display text-2xl leading-none text-mm-black">{meta?.name?.toUpperCase() ?? slug.toUpperCase()}</h3>
        <p className="mt-1 text-xs text-mm-black/60">{meta?.route}</p>
        <p className="mt-3 font-display text-lg text-mm-black">{meta?.days} DAYS · FROM {formatPrice(price)}</p>
      </div>
      <Link to={`/preview-${slug}`} className="flex items-center justify-center gap-2 border-t-[3px] border-mm-black bg-mm-pink px-4 py-3 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
        VIEW DATES & ITINERARY <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default function PreviewAllIn() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-mm-bone pb-24 md:pb-0">
      <Navbar />

      {/* ============ HERO ============ */}
      {/* Structure, type scale, padding and text placement mirror the live hero
          in Index.tsx exactly. What changes is the brief's image treatment:
          the photo itself is masked so it fades out on the left rather than
          sitting under a heavy scrim, and the black overlay is cut right back
          so the colour shows. */}
      <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">

        {/* MOBILE */}
        <div className="relative w-full md:hidden">
          <div className="absolute inset-0 z-0">
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
            <div className="absolute inset-0 bg-gradient-to-b from-mm-black/55 via-mm-black/15 to-mm-black/80" />
          </div>

          <div className="relative z-10 flex flex-col px-5 pt-[9rem] pb-24">
            <div>
              <h1 className="font-display text-[clamp(2.4rem,11.4vw,3.75rem)] leading-[0.9] text-mm-bone">
                TRIPS THAT<br />
                <span className="text-mm-lime">MAKE IT OUT</span><br />
                <span className="text-mm-pink">THE GROUP CHAT</span>
              </h1>

              <p className="mt-5 max-w-[280px] text-[14px] leading-snug text-mm-bone/85">
                Stop herding cats. 7 to 14-day epic adventures across Asia with the ultimate
                backpacker crew. Real Mad Monkey beds, zero planning, and flexible payment plans.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button onClick={() => go("trips")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone">
                  SECURE YOUR SPOT FOR $99 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="relative hidden w-full md:block">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-y-0 right-0 w-[72%]">
              <img
                src={heroImg}
                alt=""
                className="h-full w-full object-cover object-[58%_35%]"
                style={{
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.85) 36%, #000 55%)",
                  maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.85) 36%, #000 55%)",
                }}
              />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.32)_30%,rgba(0,0,0,0.06)_55%,transparent_72%)]" />
          </div>

          <div className="relative z-10 mr-auto flex max-w-6xl flex-col justify-center px-8 pt-24 pb-20 lg:pt-32 lg:pb-24 lg:pl-20">
            <div>
              <h1 className="font-display text-[clamp(3.5rem,10.5vw,7.9rem)] leading-[0.88] text-mm-bone">
                TRIPS THAT<br />
                <span className="whitespace-nowrap text-mm-lime">MAKE IT OUT</span><br />
                <span className="text-mm-pink">THE GROUP CHAT</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-snug text-mm-bone/85">
                Stop herding cats. 7 to 14-day epic adventures across Asia with the ultimate
                backpacker crew. Real Mad Monkey beds, zero planning, and flexible payment plans.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button onClick={() => go("trips")} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px]">
                  SECURE YOUR SPOT FOR $99 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHAT MAKES US DIFFERENT ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-paper py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">WHAT MAKES<br />US DIFFERENT?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DIFFERENT.map(({ icon: Icon, title, body }) => (
              <div key={title} className="border-[3px] border-mm-black bg-mm-bone p-5 shadow-mm-sm">
                <Icon className="h-8 w-8 text-mm-black" strokeWidth={2.5} />
                <h3 className="mt-3 font-display text-xl leading-none text-mm-black">{title}</h3>
                <p className="mt-2 text-sm leading-snug text-mm-black/75">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHERE'S YOUR ADVENTURE ============ */}
      <section id="trips" className="border-b-[4px] border-mm-black bg-mm-bone py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">WHERE'S YOUR<br />ADVENTURE?</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["indonesia", "indonesia-7", "vietnam", "vietnam-7", "cambodia"].map((s) => <RouteCard key={s} slug={s} />)}
          </div>
        </div>
      </section>

      {/* ============ WHAT YOUR $99 DEPOSIT UNLOCKS ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-paper py-14">
        <div className="mx-auto max-w-5xl px-5 md:px-6">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">WHAT YOUR $99<br />DEPOSIT UNLOCKS</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-sticker text-[11px] tracking-[0.16em] text-mm-black">WHAT'S IN</h3>
              <ul className="border-[3px] border-mm-black">
                {INCLUDED.map((i, n) => (
                  <li key={i} className={`flex items-start gap-2 bg-mm-bone p-3 text-sm text-mm-black ${n > 0 ? "border-t-[2px] border-mm-black/15" : ""}`}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mm-green" strokeWidth={3} /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-sticker text-[11px] tracking-[0.16em] text-mm-black">WHAT'S NOT</h3>
              <ul className="border-[3px] border-mm-black">
                {NOT_INCLUDED.map((i, n) => (
                  <li key={i} className={`flex items-start gap-2 bg-mm-bone p-3 text-sm text-mm-black/70 ${n > 0 ? "border-t-[2px] border-mm-black/15" : ""}`}>
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-mm-pink" strokeWidth={3} /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DON'T TAKE OUR WORD FOR IT ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-bone py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">DON'T TAKE<br />OUR WORD FOR IT</h2>
          <div className="mt-4 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-yellow px-3 py-2 shadow-mm-sm">
            <Star className="h-4 w-4 fill-mm-black text-mm-black" />
            <span className="font-sticker text-[10px] tracking-[0.12em] text-mm-black">RATED 4.9/5 BY 53,000+ MAD MONKEY TRAVELLERS</span>
          </div>
          {/* TikTok's embed wraps the video in its own header and caption
              chrome and lets that scroll. Each tile crops to the video: the
              iframe is oversized inside an overflow-hidden box and pulled up so
              the chrome sits outside the frame, with scrolling switched off so
              the tile can't be moved. */}
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="relative aspect-[9/16] overflow-hidden border-[3px] border-mm-black bg-mm-black shadow-mm-sm sm:aspect-[4/5] lg:aspect-auto lg:min-h-[560px]">
              <iframe
                title="Traveller video 1"
                src={`https://www.tiktok.com/embed/v2/${TIKTOKS.feature}`}
                scrolling="no"
                className="pointer-events-auto absolute left-1/2 top-[-13%] h-[168%] w-[calc(100%+2px)] -translate-x-1/2 border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[TIKTOKS.vertical1, TIKTOKS.vertical2].map((id, i) => (
                <div
                  key={id}
                  className="relative aspect-[9/16] overflow-hidden border-[3px] border-mm-black bg-mm-black shadow-mm-sm"
                >
                  <iframe
                    title={`Traveller video ${i + 2}`}
                    src={`https://www.tiktok.com/embed/v2/${id}`}
                    scrolling="no"
                    className="absolute left-1/2 top-[-13%] h-[168%] w-[calc(100%+2px)] -translate-x-1/2 border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRAVEL FOR FREE ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-pink py-14">
        <div className="mx-auto max-w-4xl px-5 text-center md:px-6">
          <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] leading-[0.95] text-mm-bone">TRAVEL FOR FREE<br />WHEN YOU BRING THE CREW</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border-[3px] border-mm-black bg-mm-bone p-5 text-left shadow-mm-sm">
              <p className="font-display text-4xl text-mm-black">{SQUAD_BENEFITS.half.headline}</p>
              <p className="mt-1 font-sticker text-[11px] tracking-[0.14em] text-mm-black">{SQUAD_BENEFITS.half.subhead}</p>
              <p className="mt-2 text-sm leading-snug text-mm-black/75">{SQUAD_BENEFITS.half.body}</p>
            </div>
            <div className="border-[3px] border-mm-black bg-mm-lime p-5 text-left shadow-mm-sm">
              <p className="font-display text-4xl text-mm-black">{SQUAD_BENEFITS.free.headline}</p>
              <p className="mt-1 font-sticker text-[11px] tracking-[0.14em] text-mm-black">{SQUAD_BENEFITS.free.subhead}</p>
              <p className="mt-2 text-sm leading-snug text-mm-black/75">{SQUAD_BENEFITS.free.body}</p>
            </div>
          </div>
          <p className="mt-6 text-[15px] text-mm-bone">You rally the group chat, we handle the logistics.</p>
          <Link to="/squad-leader" className="mt-5 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-bone px-6 py-3.5 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-sm">
            BECOME A SQUAD LEADER <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
      <StickyCta onClick={() => go("trips")} label="RESERVE FOR $99" />
    </div>
  );
}
