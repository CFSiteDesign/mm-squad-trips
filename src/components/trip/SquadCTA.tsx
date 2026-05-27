import { UserPlus, Megaphone, Send, Trophy } from "lucide-react";

const steps = [
  { n: 1, icon: UserPlus, t: "Register", d: "Get your unique \"Your Crew\" code." },
  { n: 2, icon: Megaphone, t: "Pick Your Trip", d: "Choose from our featured monthly departures." },
  { n: 3, icon: Send, t: "Share the Vibe", d: "Send your code to mates, followers, or that random you met in a hostel." },
  { n: 4, icon: Trophy, t: "Earn Your Spot", d: "Hit 8 bookings and your trip is 100% free." },
];

const tiers = [
  { tier: "Tier 1", off: "20% OFF", who: "4–5 friends booked", note: "Discount on your trip", highlight: false },
  { tier: "Tier 2", off: "30% OFF", who: "6–7 friends booked", note: "Discount on your trip", highlight: false },
  { tier: "Tier 3", off: "100% FREE", who: "8 friends booked", note: "Trip is on us", highlight: true },
];

export function SquadCTA() {
  return (
    <section className="relative overflow-hidden bg-mm-black pt-12 pb-10 text-mm-bone md:pt-20 md:pb-16">
      <div className="mx-auto max-w-6xl px-5 text-center md:px-6">
        <span className="font-sticker text-[10px] tracking-[0.24em] text-mm-bone/70">
          SQUAD LEADER PROGRAM
        </span>
        <h2 className="mt-3 font-display text-[2.25rem] uppercase leading-[0.95] tracking-tight md:mt-4 md:text-6xl lg:text-7xl">
          Earn a free trip?<br />
          <span className="text-mm-lime">Bring your squad.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-snug text-mm-bone/80 md:mt-6 md:text-lg">
          Apply to become a Mad Monkey Squad Leader. Organize the vibes, we'll handle the rest.
        </p>

        {/* How it works */}
        <div className="mt-10 md:mt-14">
          <span className="font-sticker text-[10px] tracking-[0.24em] text-mm-bone/60">HOW IT WORKS</span>
          <div className="mt-5 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.n}
                className="relative border-mm-thick border-mm-bone bg-mm-black/60 p-5 shadow-mm-bone"
              >
                <div className="font-display text-5xl leading-none text-mm-lime">{s.n}</div>
                <s.icon className="mt-3 h-6 w-6 text-mm-cyan" />
                <div className="mt-3 font-display text-lg uppercase tracking-tight">{s.t}</div>
                <p className="mt-1 text-[13px] leading-snug text-mm-bone/75">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cascading rewards */}
        <div className="mt-12 md:mt-16">
          <span className="font-sticker text-[10px] tracking-[0.24em] text-mm-bone/60">CASCADING REWARDS</span>
          <p className="mt-2 text-[13px] text-mm-bone/70 md:text-sm">The more friends you bring, the bigger the perk.</p>
          <div className="mt-6 grid gap-4 text-left md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className={`relative border-mm-thick border-mm-bone p-6 shadow-mm-bone ${
                  t.highlight ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black"
                }`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-4 border-mm-thick border-mm-black bg-mm-lime px-2 py-0.5 font-sticker text-[10px] tracking-[0.2em] text-mm-black">
                    MOST EPIC
                  </span>
                )}
                <div className="font-sticker text-[10px] tracking-[0.24em] opacity-70">{t.tier}</div>
                <div className={`mt-2 font-display text-4xl leading-none md:text-5xl ${t.highlight ? "text-mm-lime" : "text-mm-pink"}`}>
                  {t.off}
                </div>
                <div className="mt-3 font-display text-base uppercase">{t.who}</div>
                <div className="mt-1 text-[13px] opacity-80">{t.note}</div>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#booking"
          onClick={(e) => { e.preventDefault(); document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }); }}
          className="mt-10 inline-flex items-center gap-2 border-mm-thick border-mm-bone bg-mm-pink px-5 py-3 font-display text-[14px] text-mm-bone shadow-mm-bone transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:mt-12 md:px-7 md:py-3.5 md:text-base"
        >
          Become a Squad Leader →
        </a>
      </div>
    </section>
  );
}
