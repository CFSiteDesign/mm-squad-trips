import { Link } from "react-router-dom";
import { TRIPS, ACCENT_BG } from "@/data/trips";

export function TripCrossSell({ currentSlug }: { currentSlug?: string }) {
  const others = TRIPS.filter((t) => t.slug !== currentSlug);

  return (
    <section className="relative bg-mm-blue px-5 py-16 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-bone/80">
          PICK A VIBE
        </span>
        <h2 className="mt-3 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:text-7xl">
          LOOKING FOR<br />
          <span className="text-mm-lime">SOMETHING ELSE?</span>
        </h2>

        <ul className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
          {others.map((t) => (
            <li key={t.slug}>
              <Link
                to={`/${t.slug}`}
                className="group relative block h-full border-[4px] border-mm-bone bg-mm-bone p-5 text-mm-black shadow-mm transition-transform hover:-translate-x-[4px] hover:-translate-y-[4px] md:p-6"
              >
                <div className="flex items-start justify-end gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center border-[3px] border-mm-black ${ACCENT_BG[t.accent]} font-display text-2xl text-mm-black`}
                  >
                    →
                  </span>
                </div>
                <h3 className="mt-2 font-display text-[2.75rem] leading-[0.88] md:text-5xl">
                  {t.name}.
                </h3>
                <p className="mt-1 font-display text-base leading-none text-mm-orange md:text-lg">
                  {t.sub.toUpperCase()}
                </p>
                <p className="mt-4 text-[13px] font-medium leading-snug text-mm-black/80">
                  {t.route}
                </p>
                <p className="mt-5 font-sticker text-[11px] tracking-[0.14em] text-mm-black">
                  {t.days} DAYS · FROM ${t.price}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
