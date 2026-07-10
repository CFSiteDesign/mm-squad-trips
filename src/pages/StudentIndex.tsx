import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteFooter } from "@/components/trip/SiteFooter";
import heroImg from "@/assets/home-hero.png";
import allInLogo from "@/assets/all-in-logo.png";
import { TRIPS, ACCENT_BG, type Filter } from "@/data/trips";

const TICKER =
  "2 FREE SPOTS FOR SQUAD LEADERS  ·  $99 HOLDS YOUR SPOT  ·  REAL MAD MONKEY HOSTELS  ·  BRING YOUR SQUAD  ·  ";

export default function StudentIndex() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const variant: "default" | "student" = "student";
  const shown = TRIPS.filter((t) => !t.hiddenOn?.includes(variant));
  const visible = filter === "ALL" ? shown : shown.filter((t) => t.country === filter);

  return (
    <main className="relative min-h-screen overflow-hidden bg-mm-black text-mm-bone">
      {/* HERO */}
      <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">
        {/* MOBILE */}
        <div className="relative w-full md:hidden">
          <div className="absolute inset-0 z-0">
            <img src={heroImg} alt="Mad Monkey student squad" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
            <div className="absolute inset-0 bg-gradient-to-b from-mm-black/75 via-mm-black/25 to-mm-black/90" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.25)_65%,transparent_100%)]" />
          </div>
          <div className="pointer-events-none absolute right-3 top-[5rem] z-30">
            <img src={allInLogo} alt="ALL IN" className="h-12 w-auto" />
          </div>
          <div className="relative z-10 flex flex-col px-5 pt-[9rem] pb-24">
            <h1 className="font-display text-[clamp(2.5rem,11vw,4rem)] leading-[0.9] text-mm-bone">
              ALL IN<br />
              <span className="text-mm-lime">STUDENT TRIPS</span><br />
              <span className="text-mm-orange">BY MAD</span> MONKEY.
            </h1>
            <p className="mt-5 max-w-[280px] text-[14px] leading-snug text-mm-bone/85">
              That trip you've been talking about all year? Let's make it happen. You bring the crew, we'll handle the planning, logistics and bookings.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href="#destinations" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone">
                FIND YOUR TRIP <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/students/squad-leader" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-bone">
                BE A SQUAD LEADER
              </Link>
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="relative hidden w-full md:block">
          <div className="absolute inset-0 z-0">
            <img src={heroImg} alt="Mad Monkey student squad" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-mm-black/75 via-mm-black/25 to-mm-black/90" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.25)_65%,transparent_100%)]" />
          </div>
          <div className="pointer-events-none absolute right-8 top-20 z-20 origin-top-right scale-[0.60] lg:right-16 lg:top-20 lg:scale-[0.80]">
            <img src={allInLogo} alt="ALL IN" className="h-44 w-auto lg:h-56" />
          </div>
          <div className="relative z-10 mr-auto flex max-w-6xl flex-col justify-center px-8 pt-20 pb-24 lg:pt-40 lg:pl-20">
            <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] leading-[0.88] text-mm-bone">
              ALL IN<br />
              <span className="whitespace-nowrap text-mm-lime">STUDENT TRIPS</span><br />
              <span className="text-mm-orange">BY MAD</span> MONKEY.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-snug text-mm-bone/85">
              That trip you've been talking about all year? Let's make it happen. You bring the crew, we'll handle the planning, logistics and bookings.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a href="#destinations" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px]">
                FIND YOUR TRIP <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/students/squad-leader" className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-bone hover:bg-mm-bone hover:text-mm-black">
                BE A SQUAD LEADER
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker bg-mm-lime text-mm-black">
        <div className="ticker-track text-2xl font-black uppercase tracking-tight md:text-3xl">
          <span>{TICKER}{TICKER}{TICKER}</span>
          <span>{TICKER}{TICKER}{TICKER}</span>
        </div>
      </div>

      {/* DESTINATIONS */}
      <section id="destinations" className="relative bg-mm-blue px-5 py-16 text-mm-bone md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-bone/80">PICK A VIBE</span>
          <h2 className="mt-3 max-w-3xl font-display text-[2.5rem] leading-[0.92] text-mm-bone md:text-7xl">
            WHERE'S YOUR<br /><span className="text-mm-lime">ADVENTURE?</span>
          </h2>
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

          <ul className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <li key={t.slug}>
                <Link
                  to={`/students/${t.slug}`}
                  className="group relative block h-full border-[4px] border-mm-bone bg-mm-bone p-5 text-mm-black shadow-mm transition-transform hover:-translate-x-[4px] hover:-translate-y-[4px] md:p-6"
                >
                  <div className="flex items-start justify-end gap-3">
                    <span className={`flex h-12 w-12 items-center justify-center border-[3px] border-mm-black ${ACCENT_BG[t.accent]} font-display text-2xl text-mm-black`}>→</span>
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

      <SiteFooter />
    </main>
  );
}
