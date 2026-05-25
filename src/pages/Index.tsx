import { Link } from "react-router-dom";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Sticker, Starburst } from "@/components/brand/Sticker";

const TRIPS = [
  { slug: "indonesia", name: "Indonesia",   sub: "Island hopping",     route: "Bali → Gili T → Lombok",                          days: 12, price: 700, accent: "bg-mm-orange" },
  { slug: "cambodia",  name: "Cambodia",    sub: "Coast to coast",     route: "Phnom Penh → Siem Reap → Koh Rong → Koh Sdach",   days: 14, price: 650, accent: "bg-mm-lime" },
  { slug: "vietnam",   name: "Vietnam",     sub: "North loop",         route: "Hanoi → Ha Giang → Cao Bang → Halong → Hanoi",    days: 10, price: 750, accent: "bg-mm-pink" },
];

const TICKER = "ALL IN  ·  53,000+ IN THE CREW  ·  $99 HOLDS YOUR SPOT  ·  ALL IN  ·  REAL MAD MONKEY HOSTELS  ·  SOLO? NOT FOR LONG  ·  ";

export default function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-mm-black text-mm-bone">
      {/* corner decoration */}
      <div className="pointer-events-none absolute -top-16 -right-16 z-10 hidden md:block">
        <Starburst size={220} color="lime" rotate={12}>
          ALL<br />IN
        </Starburst>
      </div>
      <div className="pointer-events-none absolute left-4 top-20 z-10 md:left-6 md:top-8">
        <Sticker color="yellow" rotate={-7} className="px-2.5 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs">ALL · IN</Sticker>
      </div>

      <section className="relative z-0 mx-auto max-w-5xl px-5 pb-10 pt-40 md:px-6 md:pt-36 md:pb-12">
        <p className="font-sticker text-[11px] leading-none text-mm-lime md:text-xs">MAD MONKEY · GROUP TRIPS</p>
        <h1 className="mt-5 max-w-[18rem] font-display text-[clamp(3.25rem,15vw,9rem)] leading-[0.88] text-mm-bone md:mt-4 md:max-w-none md:text-[clamp(3.5rem,13vw,9rem)]">
          SOLO?<br />
          <span className="text-mm-orange">NOT</span><br />
          FOR LONG.
        </h1>
        <p className="mt-5 max-w-[18rem] text-[15px] leading-[1.28] text-mm-bone/82 md:mt-6 md:max-w-xl md:text-base md:leading-normal">
          Three packaged backpacker trips through SE Asia. Real Mad Monkey hostels every night. Pick one and book the flight.
        </p>
      </section>

      {/* ticker tape */}
      <div className="ticker bg-mm-lime text-mm-black">
        <div className="ticker-track font-display text-xl">
          <span>{TICKER}{TICKER}{TICKER}</span>
          <span>{TICKER}{TICKER}{TICKER}</span>
        </div>
      </div>

      <section className="relative z-0 mx-auto max-w-5xl px-5 pb-24 pt-12 md:px-6 md:pt-14 md:pb-32">
        <h2 className="font-display text-[2.25rem] leading-none text-mm-bone md:text-3xl">PICK ONE.</h2>
        <ul className="mt-6 space-y-5 md:mt-8 md:space-y-7">
          {TRIPS.map((t, i) => (
            <li key={t.slug}>
              <Link
                to={`/${t.slug}`}
                className="group relative block border-mm-thick border-mm-bone bg-mm-bone p-5 text-mm-black shadow-mm-bone transition hover:-translate-x-[4px] hover:-translate-y-[4px] md:p-8"
              >
                <div className="flex items-start justify-between gap-4 md:gap-6">
                  <div className="min-w-0">
                    <p className="font-sticker text-[11px] text-mm-black/70">TRIP 0{i + 1}</p>
                    <h3 className="mt-1 max-w-[13rem] font-display text-[3rem] leading-[0.88] md:max-w-none md:text-7xl">{t.name}.</h3>
                    <p className="mt-2 font-display text-lg leading-none text-mm-orange md:text-xl">{t.sub.toUpperCase()}</p>
                    <p className="mt-3 max-w-[15rem] text-sm font-medium leading-snug text-mm-black/80 md:mt-4 md:max-w-none">{t.route}</p>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] md:text-xs md:tracking-wider">
                      {t.days} days · from ${t.price}
                    </p>
                  </div>
                  <div className={`hidden h-28 w-28 shrink-0 items-center justify-center border-[3px] border-mm-black ${t.accent} font-display text-4xl text-mm-black md:flex`}>
                    →
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-16 font-sticker text-xs text-mm-bone/60">
          53,000+ IN OUR COMMUNITY · 24/7 LOCAL CREW · $99 HOLDS YOUR SPOT
        </p>
      </section>

      <PinnedWordmark />
    </main>
  );
}
