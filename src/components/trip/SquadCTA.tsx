import { Link } from "react-router-dom";
import { useSiteVariant, squadPath } from "@/hooks/use-site-variant";

export function SquadCTA() {
  const variant = useSiteVariant();
  const isStudent = variant === "student";
  return (
    <section className="relative overflow-hidden bg-mm-lime pt-12 pb-10 text-mm-black md:pt-20 md:pb-16">
      <div className="mx-auto max-w-6xl px-5 text-center md:px-6">
        <span className="font-sticker text-[10px] tracking-[0.24em] text-mm-black/70">
          SQUAD LEADER PROGRAM
        </span>
        {isStudent ? (
          <>
            <h2 className="mt-3 font-display text-[2.25rem] uppercase leading-[0.95] tracking-tight text-mm-black md:mt-4 md:text-6xl lg:text-7xl">
              WANT 2 FREE SPOTS?<br />
              <span className="text-mm-pink">Bring your squad.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-snug text-mm-black/80 md:mt-6 md:text-lg">
              Apply to be a Mad Monkey Student Squad Leader. You bring the crew. We'll handle the rest.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-3 font-display text-[2.25rem] uppercase leading-[0.95] tracking-tight text-mm-black md:mt-4 md:text-6xl lg:text-7xl">
              Earn a free trip?<br />
              <span className="text-mm-pink">Bring your squad.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-snug text-mm-black/80 md:mt-6 md:text-lg">
              Apply to become a Mad Monkey Squad Leader. Organize the vibes, we'll handle the rest.
            </p>
          </>
        )}
        <Link
          to={squadPath("", variant)}
          className="mt-6 inline-flex items-center border-[3px] border-mm-black bg-mm-pink px-6 py-3 font-display text-sm text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:mt-8 md:text-base"
        >
          APPLY NOW →
        </Link>
      </div>
    </section>
  );
}
