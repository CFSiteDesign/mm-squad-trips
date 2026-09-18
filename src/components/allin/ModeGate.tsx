// The "who are you?" gate. Same idea as an age gate: the page loads behind
// it, dimmed, and nothing else happens until one of the two boxes is picked.
// Copy is Kyle's (13 Sep 2026) with a sub-line each.
import { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";
import { useTravellerMode } from "@/lib/traveller-mode";

export function ModeGate() {
  const { gateOpen, chosen, choose, closeGate } = useTravellerMode();

  useEffect(() => {
    if (!gateOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gateOpen]);

  if (!gateOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-mm-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="mode-gate-title">
      <div className="relative w-full max-w-3xl border-[4px] border-mm-black bg-mm-bone p-5 shadow-mm-lg sm:p-8">
        {chosen && (
          <button onClick={closeGate} aria-label="Keep my current choice" className="absolute right-3 top-3 border-[3px] border-mm-black bg-mm-bone p-1.5 text-mm-black hover:bg-mm-yellow">
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        )}
        <p className="font-sticker text-[10px] tracking-[0.16em] text-mm-black/60">FIRST THINGS FIRST</p>
        <h2 id="mode-gate-title" className="mt-1 font-display text-[clamp(2rem,7vw,3.25rem)] leading-[0.92] text-mm-black">
          HOW ARE YOU<br />TRAVELLING?
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-snug text-mm-black/75 sm:text-[15px]">
          Two ways to do ALL IN. Pick yours and we'll show you the right trip. You can switch any time from the top bar.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => choose("independent", "gate")}
            className="group flex flex-col border-[3px] border-mm-black bg-mm-pink p-5 text-left shadow-mm-sm transition-transform duration-150 hover:-translate-y-1"
          >
            <span className="font-sticker text-[10px] tracking-[0.16em] text-mm-black">INDEPENDENTLY</span>
            <span className="mt-2 font-display text-2xl leading-[0.95] text-mm-black sm:text-[1.7rem]">
              SORT MY ROUTE AND BEDS, I'LL DO MY OWN THING.
            </span>
            <span className="mt-3 text-sm leading-snug text-mm-black/80">
              Fixed route, guaranteed hostel beds, total freedom. Book solo and meet people along the way.
            </span>
            <span className="mt-4 inline-flex items-center gap-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
              THAT'S ME <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <button
            onClick={() => choose("crew", "gate")}
            className="group flex flex-col border-[3px] border-mm-black bg-mm-lime p-5 text-left shadow-mm-sm transition-transform duration-150 hover:-translate-y-1"
          >
            <span className="font-sticker text-[10px] tracking-[0.16em] text-mm-black">WITH A CREW</span>
            <span className="mt-2 font-display text-2xl leading-[0.95] text-mm-black sm:text-[1.7rem]">
              JOIN A GROUP, TRAVEL THE WHOLE ROUTE TOGETHER
            </span>
            <span className="mt-3 text-sm leading-snug text-mm-black/80">
              Weekly departures with up to 20 backpackers. Runs once 5 have booked. Bring mates and the squad leader goes free.
            </span>
            <span className="mt-4 inline-flex items-center gap-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
              THAT'S ME <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small pill for the top bar: shows the current choice, reopens the gate. */
export function ModePill({ className = "" }: { className?: string }) {
  const { mode, chosen, openGate } = useTravellerMode();
  if (!chosen) return null;
  return (
    <button
      onClick={openGate}
      className={`inline-flex items-center gap-1.5 border-[2px] border-mm-bone/70 px-2.5 py-1 font-sticker text-[9px] tracking-[0.12em] text-mm-bone hover:bg-mm-bone hover:text-mm-black ${className}`}
      title="Change how you're travelling"
    >
      {mode === "independent" ? "INDEPENDENT" : "WITH A CREW"} <span className="text-mm-lime">· SWITCH</span>
    </button>
  );
}
