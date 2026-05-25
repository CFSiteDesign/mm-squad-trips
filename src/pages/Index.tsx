import { Link } from "react-router-dom";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Sticker, Starburst } from "@/components/brand/Sticker";

const TRIPS = [
  { slug: "indonesia", name: "Indonesia",   sub: "Island hopping",     route: "Bali → Gili T → Lombok",                          days: 12, price: 700, accent: "bg-mm-orange" },
  { slug: "cambodia",  name: "Cambodia",    sub: "Coast to coast",     route: "Phnom Penh → Siem Reap → Koh Rong → Koh Sdach",   days: 14, price: 650, accent: "bg-mm-cyan" },
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
      <div className="pointer-events-none absolute top-8 left-6 z-10">
        <Sticker color="yellow" rotate={-7}>ALL · IN</Sticker>
      </div>

      <section className="relative z-0 mx-auto max-w-5xl px-6 pt-28 pb-12 md:pt-36">
        <p className="font-sticker text-xs text-mm-lime">MAD MONKEY · GROUP TRIPS</p>
        <h1 className="mt-4 font-display text-[clamp(3.5rem,13vw,9rem)] text-mm-bone">
          SOLO?<br />
          <span className="text-mm-orange">NOT</span><br />
          FOR LONG.
        </h1>
        <p className="mt-6 max-w-xl text-base text-mm-bone/80">
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

      <section className="relative z-0 mx-auto max-w-5xl px-6 pt-14 pb-32">
        <h2 className="font-display text-3xl text-mm-bone">PICK ONE.</h2>
        <ul className="mt-8 space-y-7">
          {TRIPS.map((t, i) => (
            <li key={t.slug}>
              <Link
                to={`/${t.slug}`}
                className="group relative block border-mm-thick border-mm-bone bg-mm-bone p-6 text-mm-black shadow-mm-bone transition hover:-translate-x-[4px] hover:-translate-y-[4px] md:p-8"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="font-sticker text-[11px] text-mm-black/70">TRIP 0{i + 1}</p>
                    <h3 className="mt-1 font-display text-5xl md:text-7xl">{t.name}.</h3>
                    <p className="mt-2 font-display text-xl text-mm-orange">{t.sub.toUpperCase()}</p>
                    <p className="mt-4 text-sm font-medium text-mm-black/80">{t.route}</p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wider">
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

      <PinnedWordmark tone="light" />
    </main>
  );
}
