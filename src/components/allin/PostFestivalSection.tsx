// Home page section straight under the trips (brief, 9 Nov 2026): Collective's
// festival banner (once supplied) and the Koh Rong post-festival package card,
// which links to its own page.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchTrip } from "@/lib/api";
import { formatPrice } from "@/lib/trip-helpers";
import { FESTIVAL_BANNER, PACKAGE, PACKAGE_PATH, PACKAGE_SLUG } from "@/data/koh-rong-package";

export function PostFestivalSection() {
  const { data: trip } = useQuery({ queryKey: ["trip", PACKAGE_SLUG], queryFn: () => fetchTrip(PACKAGE_SLUG), retry: false });
  const open = trip?.departures?.find((d) => d.bookable && d.spotsRemaining > 0);
  // Once it's gone (sold out or past), the card leaves the page.
  if (trip && !open) return null;
  const price = open?.price ?? trip?.defaultPrice ?? PACKAGE.price;

  return (
    <section id="post-festival" className="border-b-[4px] border-mm-black bg-mm-paper py-14">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        {FESTIVAL_BANNER.image && FESTIVAL_BANNER.ticketUrl && (
          <a href={FESTIVAL_BANNER.ticketUrl} target="_blank" rel="noreferrer" className="mb-6 block border-[3px] border-mm-black shadow-mm-sm">
            <img src={FESTIVAL_BANNER.image} alt={FESTIVAL_BANNER.alt} className="block h-auto w-full" />
          </a>
        )}

        <article className="grid overflow-hidden border-[3px] border-mm-black bg-mm-bone shadow-mm-sm md:grid-cols-2">
          <img src={PACKAGE.hero} alt="Running into the sea on Koh Rong" className="h-64 w-full object-cover md:h-full" loading="lazy" />
          <div className="flex flex-col p-5 md:p-7">
            <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">EXCLUSIVE<br />POST-FESTIVAL PACKAGE</h2>
            <span className="mt-3 self-start border-[2px] border-mm-black bg-mm-yellow px-2 py-1 font-sticker text-[10px] tracking-[0.14em] text-mm-black">{PACKAGE.when.toUpperCase()}</span>
            <p className="mt-4 text-sm leading-snug text-mm-black/80">{PACKAGE.urgency}</p>
            <p className="mt-3 text-sm leading-snug text-mm-black/80">{PACKAGE.pitch}</p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
              <p className="font-display text-3xl leading-none text-mm-black">{formatPrice(price)}<span className="ml-1 font-sans text-xs text-mm-black/60">/person</span></p>
              <Link to={PACKAGE_PATH} className="inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-sm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]">
                {PACKAGE.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
