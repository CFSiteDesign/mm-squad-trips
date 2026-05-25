import { Button } from "@/components/ui/button";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Starburst } from "@/components/brand/Sticker";

export function Hero({ trip }: { trip: Trip }) {
  const stopCount = trip.stops.length;
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);

  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-mm-black text-mm-bone">
      {/* Top lime accent bar */}
      <div className="absolute inset-x-0 top-0 z-30 h-[6px] bg-mm-lime" />

      {/* Background media */}
      {trip.heroVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={trip.heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-mm-orange">
          <span className="font-display text-xl text-mm-black">PLACEHOLDER IMAGE</span>
        </div>
      )}

      {/* Dark scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-mm-black/55 via-mm-black/25 to-mm-black/80" />

      {/* Starburst device */}
      <div className="absolute right-4 top-10 z-20 md:right-10 md:top-16">
        <Starburst size={112} color="pink" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>

      {/* Main content stack */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-between px-5 pb-8 pt-16 md:px-12 md:pt-24">
        <div className="pt-8 md:pt-12">

          <h1 className="mt-5 font-display uppercase leading-[0.88] tracking-tight text-[clamp(3.25rem,14vw,9rem)]">
            <span className="block text-mm-bone">SOLO TRAVELLER?</span>
            <span className="block text-mm-pink">NOT FOR</span>
            <span className="block text-mm-lime">LONG.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-mm-bone/90 md:text-lg">
            {trip.days} days · {stopCount} stops · {trip.activityCount} activities · One crew
          </p>
        </div>

        {/* Bottom booking strip */}
        <div className="mt-10 w-full max-w-3xl border-mm-thick border-mm-black bg-mm-bone text-mm-black shadow-mm">
          <div className="flex flex-col md:flex-row md:items-stretch">
            <div className="flex-1 border-b-mm-thick border-mm-black px-5 py-4 md:border-b-0 md:border-r-mm-thick">
              <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-black/70">FROM</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="font-display text-4xl leading-none md:text-5xl">{formatPrice(headPrice)}</span>
                {headStrike ? (
                  <span className="mb-1 font-display text-lg text-mm-black/50 line-through">{formatPrice(headStrike)}</span>
                ) : null}
              </div>
              <p className="mt-1 font-sticker text-[10px] tracking-[0.22em] text-mm-black/70">
                {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
              </p>
            </div>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="h-auto min-h-[72px] flex-1 rounded-none bg-mm-orange font-display text-lg text-mm-black hover:bg-mm-orange md:text-xl"
            >
              PICK YOUR DATES →
            </Button>
          </div>
        </div>

        <p className="mt-4 font-sticker text-[10px] tracking-[0.24em] text-mm-bone/80">
          REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
        </p>
      </div>

      <PinnedWordmark />
    </section>
  );
}
