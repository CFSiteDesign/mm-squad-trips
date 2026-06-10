import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  PartyPopper,
  Sparkles,
  Lock,
  Globe2,
  Compass as CompassIcon,
  UserCheck,
  Users,
  MessagesSquare,
  PiggyBank,
  Star,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Sticker, Starburst } from "@/components/brand/Sticker";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { SquadCTA } from "@/components/trip/SquadCTA";
import heroImg from "@/assets/heroallin.png";
import allInLogo from "@/assets/all-in-logo.png.asset.json";

type Filter = "ALL" | "Indonesia" | "Cambodia" | "Vietnam";

type TripCard = {
  slug: string;
  country: Filter;
  name: string;
  sub: string;
  route: string;
  days: number;
  price: number;
  accent: "orange" | "lime" | "pink" | "cyan";
};

const TRIPS: TripCard[] = [
  { slug: "indonesia", country: "Indonesia", name: "Indonesia",  sub: "Island hopping",  route: "Bali → Gili T → Lombok → Uluwatu",                days: 12, price: 700, accent: "orange" },
  { slug: "cambodia",  country: "Cambodia",  name: "Cambodia",   sub: "Coast to coast",  route: "Phnom Penh → Siem Reap → Koh Rong → Koh Sdach",   days: 14, price: 650, accent: "lime"   },
  { slug: "vietnam",   country: "Vietnam",   name: "Vietnam",    sub: "North loop",      route: "Hanoi → Ha Giang → Cao Bang → Halong → Hanoi",    days: 10, price: 750, accent: "pink"   },
];

const ACCENT_BG: Record<TripCard["accent"], string> = {
  orange: "bg-mm-orange",
  lime: "bg-mm-lime",
  pink: "bg-mm-pink",
  cyan: "bg-mm-cyan",
};

const INCLUDED_TABS: { name: string; items: { icon: any; title: string; desc: string }[] }[] = [
  {
    name: "Accommodation",
    items: [
      { icon: Building2, title: "Best hostels on the route", desc: "Real Mad Monkey beds every single night. No mystery dorms." },
      { icon: PartyPopper, title: "Hostel activities", desc: "Party nights, games evenings, pool hangs — built in." },
    ],
  },
  {
    name: "Experiences",
    items: [
      { icon: Sparkles, title: "Must-see stops with a twist", desc: "You won't miss anything and you'll have stuff to brag about." },
      { icon: Lock, title: "Exclusive experiences", desc: "Access stuff you simply can't book travelling solo." },
      { icon: Globe2, title: "Local & authentic", desc: "Real culture, real places, no plastic tourist tours." },
    ],
  },
  {
    name: "Freedom",
    items: [
      { icon: CompassIcon, title: "Free time to do your thing", desc: "Spend your time and cash on what matters to you." },
      { icon: UserCheck, title: "Local guide on call", desc: "Don't waste a day googling the best bar or beach." },
    ],
  },
  {
    name: "People",
    items: [
      { icon: Users, title: "Crews of up to 24", desc: "Meet like-minded travellers from all over." },
      { icon: MessagesSquare, title: "Plus the hostel crowd", desc: "More chances to find your people every single night." },
    ],
  },
  {
    name: "Value",
    items: [
      { icon: PiggyBank, title: "Essentials in, ego out", desc: "Real prices. More cash left for what you actually want." },
    ],
  },
];

const TESTIMONIALS = [
  { name: "Sarah K.", trip: "Ha Giang Loop",      quote: "Best 5 days of my life. Made friends I'll travel with for years." },
  { name: "Tom L.",   trip: "Indonesia Islands",  quote: "Felt looked after the whole way. Sunsets were unreal." },
  { name: "Maya R.",  trip: "Cambodia Coast",     quote: "I came alone and left with a squad. 10 / 10." },
];

const TICKER = "ALL IN  ·  53,000+ IN THE CREW  ·  $99 HOLDS YOUR SPOT  ·  REAL MAD MONKEY HOSTELS  ·  SOLO? NOT FOR LONG  ·  ";

export default function Index() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [tab, setTab] = useState(0);
  const visible = filter === "ALL" ? TRIPS : TRIPS.filter((t) => t.country === filter);

  return (
    <main className="relative min-h-screen overflow-hidden bg-mm-black text-mm-bone">
      <PinnedWordmark />

      {/* ============ HERO ============ */}
      <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">
        {/* Become a Squad Leader CTA — top right */}
        <Link
          to="/squad-leader"
          className="absolute right-4 top-4 z-40 inline-flex items-center border-[3px] border-mm-bone bg-mm-pink px-3 py-1.5 font-display text-[10px] text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:right-8 md:top-8 md:px-4 md:py-2 md:text-sm"
        >
          BECOME A SQUAD LEADER →
        </Link>

        {/* ALL · IN sticker (both layouts) */}
        <div className="pointer-events-none absolute left-4 top-[5.2rem] z-30 md:left-8 md:top-28">
          <Sticker color="yellow" rotate={-7} className="px-2.5 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs">
            ALL · IN
          </Sticker>
        </div>

        {/* MOBILE: full-bleed hero image, text overlaid — mirrors desktop layout */}
        <div className="relative w-full md:hidden">
          {/* Background image + overlays */}
          <div className="absolute inset-0 z-0">
            <img src={heroImg} alt="Mad Monkey squad on the beach at sunset" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
            <div className="absolute inset-0 bg-gradient-to-b from-mm-black/75 via-mm-black/25 to-mm-black/90" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.25)_65%,transparent_100%)]" />
          </div>

          {/* ALL IN logo — top right */}
          <div className="pointer-events-none absolute right-3 top-[5rem] z-30">
            <img src={allInLogo.url} alt="ALL IN" className="h-24 w-auto" />
          </div>

          {/* Foreground content */}
          <div className="relative z-10 flex flex-col px-5 pt-[9rem] pb-24">
            <div>
              <h1 className="font-display text-[clamp(2.75rem,13vw,4.25rem)] leading-[0.9] text-mm-bone">
                ALL IN<br />
                <span className="text-mm-lime">GROUP TRIPS</span><br />
                <span className="text-mm-orange">BY MAD</span> MONKEY.
              </h1>

              <p className="mt-5 max-w-[260px] text-[14px] leading-snug text-mm-bone/85">
                For travellers with friends who never commit. Trips that actually make it out of the group chat.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href="#destinations" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone">
                  FIND YOUR TRIP <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#included" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-bone">
                  WHAT'S IN IT
                </a>
              </div>
            </div>

            <p className="mt-7 font-sticker text-[10px] tracking-[0.22em] text-mm-bone/55">
              53,000+ IN THE CREW · 24/7 LOCAL · $99 HOLDS YOUR SPOT
            </p>
          </div>
        </div>

        {/* DESKTOP: full-bleed media background + overlaid content */}
        <div className="relative hidden min-h-[100svh] w-full md:block">
          <div className="absolute inset-0 z-0">
            <img src={heroImg} alt="Mad Monkey squad on the beach at sunset" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-mm-black/75 via-mm-black/25 to-mm-black/90" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.25)_65%,transparent_100%)]" />
          </div>

          <div className="pointer-events-none absolute right-8 top-20 z-20 origin-top-right scale-[0.78] lg:right-16 lg:top-20 lg:scale-100">
            <img src={allInLogo.url} alt="ALL IN" className="h-44 w-auto lg:h-56" />
          </div>

          <div className="relative z-10 mr-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-8 pt-20 pb-16 lg:justify-between lg:pt-40 lg:pl-20">
            <div>
              <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-[0.88] text-mm-bone">

                ALL IN<br />
                <span className="whitespace-nowrap text-mm-lime">GROUP TRIPS</span><br />
                <span className="text-mm-orange">BY MAD</span> MONKEY.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-snug text-mm-bone/85">
                For travellers with friends who never commit. Trips that actually make it out of the group chat.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#destinations" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px]">
                  FIND YOUR TRIP <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#included" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-bone hover:bg-mm-bone hover:text-mm-black">
                  WHAT'S IN IT
                </a>
              </div>
            </div>

            <p className="mt-16 font-sticker text-[10px] tracking-[0.22em] text-mm-bone/55">
              53,000+ IN THE CREW · 24/7 LOCAL · $99 HOLDS YOUR SPOT
            </p>
          </div>
        </div>
      </section>


      {/* ============ TICKER ============ */}
      <div className="ticker bg-mm-lime text-mm-black">
        <div className="ticker-track text-2xl font-black uppercase tracking-tight md:text-3xl">
          <span>{TICKER}{TICKER}{TICKER}</span>
          <span>{TICKER}{TICKER}{TICKER}</span>
        </div>
      </div>

      {/* ============ DESTINATIONS ============ */}
      <section id="destinations" className="relative bg-mm-blue px-5 py-16 text-mm-bone md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-bone/80">PICK A VIBE</span>
          <h2 className="mt-3 max-w-3xl font-display text-[2.5rem] leading-[0.92] text-mm-bone md:text-7xl">
            WHERE'S YOUR<br /><span className="text-mm-lime">ADVENTURE?</span>
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-snug text-mm-bone/85 md:text-lg">
            Maybe you know where you want to go. Maybe it's pin-in-the-map time. Scroll the trips — adventure is guaranteed either way.
          </p>

          {/* filter chips */}
          <div className="mt-7 flex flex-wrap gap-3 md:mt-9">
            {(["ALL", "Indonesia", "Cambodia", "Vietnam"] as Filter[]).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    "inline-flex items-center gap-2 border-[3px] border-mm-bone px-4 py-2 font-sticker text-[11px] tracking-[0.14em] transition-transform md:text-xs",
                    active
                      ? "bg-mm-pink text-mm-black shadow-mm-bone -translate-x-[2px] -translate-y-[2px]"
                      : "bg-transparent text-mm-bone hover:bg-mm-bone hover:text-mm-black",
                  ].join(" ")}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {f.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* trip cards */}
          <ul className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((t, i) => (
              <li key={t.slug}>
                <Link
                  to={`/${t.slug}`}
                  className="group relative block h-full border-[4px] border-mm-bone bg-mm-bone p-5 text-mm-black shadow-mm transition-transform hover:-translate-x-[4px] hover:-translate-y-[4px] md:p-6"
                >
                  <div className="flex items-start justify-end gap-3">
                    <span className={`flex h-12 w-12 items-center justify-center border-[3px] border-mm-black ${ACCENT_BG[t.accent]} font-display text-2xl text-mm-black`}>
                      →
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-[2.75rem] leading-[0.88] md:text-5xl">{t.name}.</h3>
                  <p className="mt-1 font-display text-base leading-none text-mm-orange md:text-lg">
                    {t.sub.toUpperCase()}
                  </p>
                  <p className="mt-4 text-[13px] font-medium leading-snug text-mm-black/80">{t.route}</p>
                  <p className="mt-5 font-sticker text-[11px] tracking-[0.14em] text-mm-black">
                    {t.days} DAYS · FROM ${t.price}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ INCLUDED ============ */}
      <section id="included" className="relative bg-mm-bone px-5 py-16 text-mm-black md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-black/70">WHAT'S IN</span>
          <h2 className="mt-3 font-display text-[2.5rem] leading-[0.92] md:text-6xl">
            INCLUDED IN<br /><span className="text-mm-pink">EVERY TRIP.</span>
          </h2>

          <div className="mt-7 flex flex-wrap gap-2.5 md:mt-9">
            {INCLUDED_TABS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setTab(i)}
                className={[
                  "border-[3px] border-mm-black px-4 py-2 font-sticker text-[11px] tracking-[0.14em] transition-transform md:text-xs",
                  i === tab
                    ? "bg-mm-black text-mm-bone shadow-mm-sm -translate-x-[2px] -translate-y-[2px]"
                    : "bg-mm-paper text-mm-black hover:bg-mm-lime",
                ].join(" ")}
              >
                {t.name.toUpperCase()}
              </button>
            ))}
          </div>

          <ul className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
            {INCLUDED_TABS[tab].items.map((b) => (
              <li key={b.title} className="flex h-full min-h-[220px] flex-col border-[3px] border-mm-black bg-mm-paper p-5 shadow-mm-sm">
                <div className="flex h-12 w-12 items-center justify-center border-[3px] border-mm-black bg-mm-lime text-mm-black">
                  <b.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 font-display text-xl leading-tight text-mm-black md:text-2xl">
                  {b.title}
                </div>
                <p className="mt-2 text-base leading-snug text-mm-black/75">{b.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="relative bg-mm-orange px-5 py-16 text-mm-black md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-black/70">REVIEWS</span>
          <h2 className="mt-3 font-display text-[2.5rem] leading-[0.92] md:text-6xl">
            WHAT TRAVELLERS<br /><span className="text-mm-bone">ARE SAYING.</span>
          </h2>

          <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-3">
            {TESTIMONIALS.map((r) => (
              <div key={r.name} className="border-[3px] border-mm-black bg-mm-paper p-5 shadow-mm">
                <div className="flex gap-1 text-mm-pink">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-[15px] leading-snug text-mm-black">"{r.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border-[3px] border-mm-black bg-mm-lime font-display text-sm text-mm-black">
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-sticker text-[11px] tracking-[0.12em] text-mm-black">{r.name}</div>
                    <div className="text-xs text-mm-black/65">{r.trip}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SQUAD LEADER CTA ============ */}
      <SquadCTA />

      <SiteFooter />
    </main>
  );
}
