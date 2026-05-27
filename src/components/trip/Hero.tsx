import { Button } from "@/components/ui/button";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Starburst } from "@/components/brand/Sticker";

export function Hero({ trip }: { trip: Trip }) {
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);

  // Headline cluster: logo + headline + subhead — tight internal spacing
  const HeadlineCluster = (
    <div className="relative">
      <div className="max-w-[16rem] md:max-w-5xl">
        <h1 className="font-display uppercase leading-[0.9] tracking-tight text-[clamp(2.6rem,14vw,3.7rem)] md:text-[clamp(2.5rem,11vw,9rem)] md:leading-[0.86]">
          <span className="block text-mm-bone">SOLO TRAVELLER?</span>
          <span className="block whitespace-nowrap text-mm-pink">NOT FOR</span>
          <span className="block text-mm-lime">LONG.</span>
        </h1>
        <p className="mt-1.5 whitespace-nowrap text-[13px] leading-[1.15] text-mm-bone/90 md:mt-3 md:whitespace-normal md:text-lg md:leading-snug">
          {trip.days} days · {trip.stops.length} stops · {trip.activityCount} activities <span className="whitespace-nowrap">· One crew</span>
        </p>
      </div>
    </div>
  );

  // Media band: the only vertically flexing zone, ready for a background video
  const MediaBand = (
    <div
      className="relative w-full overflow-hidden border border-mm-bone/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
      style={{
        minHeight: "32vh",
        maxHeight: "40vh",
        backgroundImage:
          "linear-gradient(to bottom, hsl(0 0% 12%), hsl(0 0% 0%))",
      }}
    >
      {/* TODO: Replace this placeholder div with the background <video> element.
          The video should be: full-bleed, object-cover, muted, autoplay, loop, playsInline.
          Example:
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={trip.heroVideoUrl}
              autoPlay muted loop playsInline preload="auto"
            />
      */}
      {trip.heroVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={trip.heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-sticker text-[11px] uppercase tracking-[0.32em] text-mm-bone/35 md:text-sm md:tracking-[0.4em]">
            VIDEO PLACEHOLDER
          </span>
        </div>
      )}

      {/* Starburst sits over the media band */}
      <div className="absolute right-3 top-3 z-20 md:hidden">
        <Starburst size={64} color="pink" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>
      <div className="absolute right-8 top-6 z-20 hidden md:block">
        <Starburst size={132} color="pink" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>
    </div>
  );

  const PriceBlock = (
    <div className="w-full max-w-[21rem] border-mm-thick border-mm-black bg-mm-bone text-mm-black shadow-mm md:max-w-3xl">
      <div className="flex items-stretch">
        <div className="flex-1 border-r-mm-thick border-mm-black px-3 py-2.5 md:px-5 md:py-4">
          <p className="font-sticker text-[9px] tracking-[0.18em] text-mm-black/70 md:text-[10px] md:tracking-[0.22em]">FROM</p>
          <div className="mt-0.5 flex items-end gap-2 md:mt-1 md:gap-3">
            <span className="font-display text-2xl leading-none md:text-5xl">{formatPrice(headPrice)}</span>
            {headStrike ? (
              <span className="mb-0.5 font-display text-xs text-mm-black/50 line-through md:mb-1 md:text-lg">{formatPrice(headStrike)}</span>
            ) : null}
          </div>
          <p className="mt-0.5 max-w-[8.5rem] font-sticker text-[8px] leading-tight tracking-[0.16em] text-mm-black/70 md:mt-1 md:max-w-none md:text-[10px] md:tracking-[0.22em]">
            {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
          </p>
        </div>
        <Button
          onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
          className="h-auto min-h-0 flex-1 rounded-none bg-mm-orange px-3 py-2.5 font-display text-[1.05rem] leading-[1.05] text-mm-black hover:bg-mm-orange md:min-h-[72px] md:px-4 md:text-xl"
        >
          PICK YOUR<br className="md:hidden" /> DATES →
        </Button>
      </div>
    </div>
  );

  const ProofLine = (
    <p className="max-w-[19rem] font-sticker text-[9px] tracking-[0.18em] text-mm-bone/80 md:max-w-none md:text-[10px] md:tracking-[0.24em]">
      REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
    </p>
  );

  return (
    <section className="relative isolate w-full overflow-hidden bg-mm-black text-mm-bone">
      {/* Mobile: 4 stacked layers — headline / media (flex) / price / proof */}
      <div className="relative z-10 flex w-full flex-col px-4 pb-8 pt-24 md:hidden">
        {HeadlineCluster}

        <div className="mt-6 flex-1">
          {MediaBand}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {PriceBlock}
          {ProofLine}
        </div>
      </div>

      {/* Desktop: same 4-layer logic */}
      <div className="relative z-10 mx-auto hidden w-full max-w-7xl flex-col px-12 pb-14 pt-32 md:flex">
        {HeadlineCluster}

        <div className="mt-10 flex-1">
          {MediaBand}
        </div>

        <div className="mt-10 flex flex-col gap-6">
          {PriceBlock}
          {ProofLine}
        </div>
      </div>

      <PinnedWordmark />
    </section>
  );
}
