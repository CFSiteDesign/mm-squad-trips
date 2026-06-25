import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { SiteFooter } from "@/components/trip/SiteFooter";

const STEPS = [
  { n: 1, t: "APPLY", d: "Send your application — Hayley reviews and approves." },
  { n: 2, t: "PICK YOUR TRIP", d: "Choose any departure date." },
  { n: 3, t: "SHARE YOUR CODE", d: "Send your code to the rest of your squad." },
  { n: 4, t: "HIT 10 BOOKINGS", d: "Get 2 extra spots on us." },
];

const FAQS = [
  { q: "What if less than 10 people book?", a: "No free spots, but you'll still travel at the standard price with the squad you brought along." },
  { q: "When do my free spots get applied?", a: "Once you hit 10 bookings, email Hayley and she'll add your 2 free spots to the trip." },
  { q: "Can I lead more than one trip?", a: "Yes — after your first successful trip you can apply for additional departures." },
  { q: "How long does my code stay active?", a: "12 months from approval, or until your chosen trip departs." },
];

export default function StudentSquadHub() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-mm-paper text-mm-black">
      <section className="relative overflow-hidden bg-mm-black px-5 pt-20 pb-20 text-mm-bone md:px-8 md:pt-28 md:pb-28">
        <div className="absolute left-5 right-5 top-5 z-20 md:left-8 md:right-8 md:top-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 font-display text-sm text-mm-bone/80 hover:text-mm-bone"
          >
            <ArrowLeft className="h-4 w-4" /> BACK
          </button>
        </div>
        <div className="mx-auto max-w-5xl pt-10 md:pt-6">
          <Sticker color="lime" rotate={-3}>STUDENT SQUAD LEADER</Sticker>
          <h1 className="mt-5 font-display text-[2.5rem] leading-[0.92] md:text-7xl lg:text-8xl">
            WANT 2 FREE SPOTS?<br />
            <span className="text-mm-lime">BRING YOUR SQUAD.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-mm-bone/80 md:text-lg">
            Apply to be a Mad Monkey Student Squad Leader. You bring the crew. We'll handle the rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/students/squad-leader/register"
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
          <p className="mt-4 text-sm text-mm-bone/70">
            Already approved?{" "}
            <Link to="/students/squad-leader/login" className="font-display text-mm-lime underline">
              LOG IN TO YOUR DASHBOARD
            </Link>
          </p>
        </div>
      </section>

      <section id="how" className="bg-mm-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <Sticker color="orange" rotate={-2}>HOW IT WORKS</Sticker>
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

      <section className="bg-mm-pink px-5 py-16 text-mm-bone md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-4xl md:text-6xl">READY TO ROUND UP THE SQUAD?</h2>
          <Link
            to="/students/squad-leader/register"
            className="mt-8 inline-flex border-[3px] border-mm-bone bg-mm-black px-8 py-4 font-display text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
          >
            APPLY NOW →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
