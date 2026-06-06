import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { SiteFooter } from "@/components/trip/SiteFooter";

const STEPS = [
  { n: 1, t: "REGISTER", d: "Get your unique squad code in seconds." },
  { n: 2, t: "PICK YOUR TRIP", d: "Choose any departure you'd like to lead." },
  { n: 3, t: "SHARE THE VIBE", d: "Send your code to mates, followers, anyone." },
  { n: 4, t: "EARN YOUR SPOT", d: "Hit 8 bookings and your trip is on us." },
];

const TIERS = [
  { off: "50% OFF", who: "4 friends booked", note: "Half-price trip, on us", highlight: false },
  { off: "100% FREE", who: "8 friends booked", note: "The whole trip is on us", highlight: true },
];

const FAQS = [
  { q: "What if I get fewer than 4 bookings?", a: "No discount applies, but you'll still travel at the standard price with the squad you brought along." },
  { q: "When does my discount get applied?", a: "It locks in automatically as soon as bookings tick over each milestone." },
  { q: "Can I lead more than one trip?", a: "Yes — after your first successful trip you can apply for additional departures." },
  { q: "How long does my code stay active?", a: "12 months from registration, or until your chosen trip departs." },
];

export default function SquadHub() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-mm-paper text-mm-black">
      {/* Hero */}
      <section className="relative overflow-hidden bg-mm-black px-5 py-20 text-mm-bone md:px-8 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 font-display text-sm text-mm-bone/80 hover:text-mm-bone"
            >
              <ArrowLeft className="h-4 w-4" /> BACK
            </button>
            <Link
              to="/squad-leader/register"
              className="inline-flex items-center border-[3px] border-mm-bone bg-mm-pink px-4 py-2 font-display text-sm text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
            >
              BECOME A SQUAD LEADER →
            </Link>
          </div>
          <Sticker color="lime" rotate={-3}>SQUAD LEADER HUB</Sticker>
          <h1 className="mt-5 font-display text-[2.5rem] leading-[0.92] md:text-7xl lg:text-8xl">
            EARN A FREE TRIP?<br />
            <span className="text-mm-lime">BRING YOUR SQUAD.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-mm-bone/80 md:text-lg">
            Apply to become a Mad Monkey Squad Leader. Organise the vibes — we'll handle the rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/squad-leader/register"
              className="inline-flex items-center border-[3px] border-mm-bone bg-mm-pink px-6 py-3 font-display text-sm text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
            >
              APPLY NOW →
            </Link>
            <a
              href="#how"
              className="inline-flex items-center border-[3px] border-mm-bone bg-transparent px-6 py-3 font-display text-sm text-mm-bone hover:bg-mm-bone hover:text-mm-black"
            >
              HOW IT WORKS
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-mm-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <Sticker color="orange" rotate={-2}>PROCESS</Sticker>
          <h2 className="mt-4 font-display text-4xl md:text-6xl">HOW IT WORKS</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="border-mm-thick bg-mm-bone p-5 shadow-mm-sm">
                <div className="font-display text-5xl text-mm-pink">{s.n}</div>
                <div className="mt-3 font-display text-lg">{s.t}</div>
                <p className="mt-2 text-sm text-mm-black/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-mm-lime px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl text-mm-black md:text-6xl">CASCADING REWARDS</h2>
          <p className="mt-3 font-sticker text-xs tracking-[0.18em] text-mm-black/70">
            THE MORE FRIENDS YOU BRING, THE BIGGER THE PERK
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {TIERS.map((t) => (
              <div
                key={t.off}
                className={`relative border-[3px] border-mm-black p-8 shadow-mm ${
                  t.highlight ? "bg-mm-pink text-mm-bone" : "bg-mm-paper text-mm-black"
                }`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 border-[3px] border-mm-black bg-mm-orange px-3 py-1 font-sticker text-[10px] tracking-[0.15em] text-mm-black">
                    MOST EPIC
                  </span>
                )}
                <div className="font-display text-6xl">{t.off}</div>
                <div className={`mt-4 font-display text-lg ${t.highlight ? "text-mm-bone" : ""}`}>{t.who}</div>
                <div className={`mt-1 text-sm ${t.highlight ? "text-mm-bone/80" : "text-mm-black/70"}`}>{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-mm-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl md:text-6xl">FAQ</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="border-mm-thick bg-mm-bone p-5 shadow-mm-sm">
                <summary className="cursor-pointer font-display text-base">{f.q}</summary>
                <p className="mt-3 text-sm text-mm-black/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-mm-pink px-5 py-16 text-mm-bone md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl md:text-6xl">READY TO ROUND UP THE SQUAD?</h2>
          <Link
            to="/squad-leader/register"
            className="mt-8 inline-flex border-[3px] border-mm-bone bg-mm-black px-8 py-4 font-display text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            BECOME A SQUAD LEADER →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
