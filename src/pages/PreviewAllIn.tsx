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
import { Sticker } from "@/components/brand/Sticker";
import { PreviewBadge, StickyCta } from "@/components/preview/PreviewChrome";
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

/** Live "next departure" badge per trip, read from the real departures table. */
function RouteCard({ slug }: { slug: string }) {
  const meta = TRIPS.find((t) => t.slug === slug);
  const { data: trip } = useQuery({ queryKey: ["trip", slug], queryFn: () => fetchTrip(slug), retry: false });
  const next = trip?.departures?.find((d) => d.bookable);
  const price = trip?.departures?.[0]?.price ?? trip?.defaultPrice ?? meta?.price ?? 0;
  const urgent = next && next.spotsRemaining <= 10;

  return (
    <article className="flex flex-col border-[3px] border-mm-black bg-mm-bone shadow-mm-sm">
      <div className="flex-1 p-4">
        {next && (
          <span className={`inline-block border-[2px] border-mm-black px-2 py-1 font-sticker text-[9px] tracking-[0.1em] text-mm-black ${urgent ? "bg-mm-orange" : "bg-mm-lime"}`}>
            {urgent ? "🔥 " : ""}NEXT TRIP: {new Date(next.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
            {/* Only claim scarcity when it is real. "ONLY 20 SPOTS LEFT" on an
                untouched departure advertises that nobody has booked it. */}
            {urgent ? ` (ONLY ${next.spotsRemaining} SPOTS LEFT)` : ""}
          </span>
        )}
        <h3 className="mt-3 font-display text-2xl leading-none text-mm-black">{meta?.name?.toUpperCase() ?? slug.toUpperCase()}</h3>
        <p className="mt-1 text-xs text-mm-black/60">{meta?.route}</p>
        <p className="mt-3 font-display text-lg text-mm-black">{meta?.days} DAYS · FROM {formatPrice(price)}</p>
      </div>
      <Link to={`/${slug}`} className="flex items-center justify-center gap-2 border-t-[3px] border-mm-black bg-mm-pink px-4 py-3 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
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
      <PreviewBadge label="ALL IN TRIPS LANDING" />
      <Navbar />

      {/* ============ HERO ============ */}
      <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-black bg-mm-black">
        {/* Photo sits right, faded out to the left so the copy stays legible.
            Overlay is deliberately lighter than the live hero so the colour shows. */}
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.72)_35%,rgba(0,0,0,0.30)_62%,rgba(0,0,0,0.05)_85%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-mm-black/40 via-transparent to-mm-black/55 md:hidden" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-32">
          <Sticker color="lime" rotate={-3}>ALL IN TRIPS BY MAD MONKEY</Sticker>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,8.5vw,5.25rem)] leading-[0.88] text-mm-bone">
            TRIPS THAT<br />MAKE IT OUT<br /><span className="text-mm-pink">THE GROUP CHAT</span>
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-snug text-mm-bone/90">
            Stop herding cats. 7 to 14-day epic adventures across Asia with the ultimate
            backpacker crew. Real Mad Monkey beds, zero planning, and $99 holds your spot.
          </p>
          <button onClick={() => go("trips")} className="mt-7 inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-6 py-4 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone">
            SECURE YOUR SPOT FOR $99 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ============ WHAT MAKES US DIFFERENT ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-paper py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">WHAT MAKES<br />US DIFFERENT?</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mm-black/80">
            Every trip includes our iconic community event, rooted in the location. A Khmer
            BBQ over locally caught fish, or a jungle party where your group and our local
            team celebrate side by side.
          </p>
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[1, 2].map((n) => (
              <div key={n} className="flex aspect-[9/12] flex-col items-center justify-center gap-2 border-[3px] border-dashed border-mm-black/40 bg-mm-black/5 p-6 text-center">
                <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">VIDEO {n} PENDING</span>
                <span className="text-xs text-mm-black/50">TikTok / Reels embed, link from Lexie</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRAVEL FOR FREE ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-pink py-14">
        <div className="mx-auto max-w-4xl px-5 text-center md:px-6">
          <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] leading-[0.95] text-mm-bone">TRAVEL FOR FREE<br />WHEN YOU BRING THE CREW</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border-[3px] border-mm-black bg-mm-bone p-5 shadow-mm-sm">
              <p className="font-display text-4xl text-mm-black">50% OFF</p>
              <p className="mt-1 text-sm text-mm-black/75">Bring 4 friends and get half off your trip.</p>
            </div>
            <div className="border-[3px] border-mm-black bg-mm-lime p-5 shadow-mm-sm">
              <p className="font-display text-4xl text-mm-black">100% FREE</p>
              <p className="mt-1 text-sm text-mm-black/75">Bring 8 friends and you travel completely free.</p>
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
