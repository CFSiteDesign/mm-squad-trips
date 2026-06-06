import { ArrowRight } from "lucide-react";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Sticker, Starburst } from "@/components/brand/Sticker";

export function Hero({ trip, heroImageUrl }: { trip: Trip; heroImageUrl?: string }) {
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);
  const hasVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(trip.heroVideoUrl ?? "");


  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const BackgroundMedia = (
    <>
      {hasVideo ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={trip.heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : heroImageUrl ? (
        <img
          src={heroImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-mm-black"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, hsl(0 0% 12%), hsl(0 0% 0%))",
          }}
        >
          <span className="font-display text-2xl tracking-[0.2em] text-mm-lime md:text-4xl">
            PLACEHOLDER
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-mm-black/75 via-mm-black/25 to-mm-black/90" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.65)_40%,rgba(0,0,0,0.25)_65%,transparent_100%)]" />
    </>
  );

  return (
    <section className="relative isolate w-full overflow-hidden border-b-[4px] border-mm-bone bg-mm-black text-mm-bone">
      {/* ============ MOBILE ============ */}
      <div className="relative w-full md:hidden">
        <div className="absolute inset-0 z-0">{BackgroundMedia}</div>

        {/* ALL · IN sticker */}
        <div className="pointer-events-none absolute left-4 top-[5.2rem] z-30">
          <Sticker color="yellow" rotate={-7} className="px-2.5 py-1 text-[11px]">
            ALL · IN
          </Sticker>
        </div>

        {/* Starburst */}
        <div className="pointer-events-none absolute right-3 top-[5rem] z-30">
          <Starburst size={92} color="pink" rotate={-12}>
            {trip.days}
            <br />
            DAYS
          </Starburst>
        </div>

        {/* Foreground content */}
        <div className="relative z-10 flex flex-col px-5 pt-[9rem] pb-24">
          <div>
            <h1 className="font-display text-[clamp(2.75rem,13vw,4.25rem)] leading-[0.9] text-mm-bone">
              <span className="block">SOLO TRAVELLER?</span>
              <span className="block whitespace-nowrap text-mm-pink">NOT FOR</span>
              <span className="block text-mm-lime">LONG.</span>
            </h1>

            <p className="mt-5 max-w-[260px] text-[14px] leading-snug text-mm-bone/85">
              {trip.days} days · {trip.stops.length} stops · {trip.activityCount} activities · One crew
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollTo("booking")}
                className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone"
              >
                PICK YOUR DATES <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollTo("included")}
                className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-bone"
              >
                WHAT'S INCLUDED
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mt-6">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl leading-none text-mm-lime">
                {formatPrice(headPrice)}
              </span>
              {headStrike ? (
                <span className="font-display text-xl leading-none text-mm-bone/50 line-through">
                  {formatPrice(headStrike)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-sticker text-[10px] tracking-[0.18em] text-mm-bone/70">
              {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
            </p>
          </div>

          <p className="mt-7 font-sticker text-[10px] tracking-[0.22em] text-mm-bone/55">
            REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
          </p>
        </div>
      </div>


      {/* ============ DESKTOP ============ */}
      <div className="relative hidden min-h-[100svh] w-full md:block">
        <div className="absolute inset-0 z-0">{BackgroundMedia}</div>

        {/* ALL · IN sticker */}
        <div className="pointer-events-none absolute left-8 top-28 z-30">
          <Sticker color="yellow" rotate={-7} className="px-3 py-1.5 text-xs">
            ALL · IN
          </Sticker>
        </div>

        {/* Starburst */}
        <div className="pointer-events-none absolute right-8 top-20 z-20 origin-top-right scale-[0.78] lg:right-16 lg:top-20 lg:scale-100">
          <Starburst size={180} color="pink" rotate={-12} textClassName="text-2xl">
            {trip.days}
            <br />
            DAYS
          </Starburst>
        </div>

        <div className="relative z-10 mr-auto flex max-w-6xl flex-col px-8 pt-20 pb-16 md:pt-24 lg:min-h-[100svh] lg:justify-between lg:pt-40 lg:pl-20">
          <div>
            <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-[0.88] text-mm-bone">
              <span className="block">SOLO TRAVELLER?</span>
              <span className="block whitespace-nowrap text-mm-pink">NOT FOR</span>
              <span className="block text-mm-lime">LONG.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-snug text-mm-bone/85">
              {trip.days} days · {trip.stops.length} stops · {trip.activityCount} activities · One crew
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollTo("booking")}
                className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-black shadow-mm-bone transition-transform hover:-translate-x-[3px] hover:-translate-y-[3px]"
              >
                PICK YOUR DATES <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollTo("included")}
                className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-transparent px-5 py-3 font-sticker text-sm tracking-[0.14em] text-mm-bone hover:bg-mm-bone hover:text-mm-black"
              >
                WHAT'S INCLUDED
              </button>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4 lg:gap-6">
            <div>
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl leading-none text-mm-lime lg:text-6xl">
                  {formatPrice(headPrice)}
                </span>
                {headStrike ? (
                  <span className="font-display text-2xl leading-none text-mm-bone/50 line-through lg:text-3xl">
                    {formatPrice(headStrike)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-sticker text-[10px] tracking-[0.22em] text-mm-bone/70">
                {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
              </p>
            </div>
            <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-bone/55">
              REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
            </p>
          </div>

        </div>
      </div>

      <PinnedWordmark />
    </section>
  );
}
