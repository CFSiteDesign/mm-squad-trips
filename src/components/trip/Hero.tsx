import { Button } from "@/components/ui/button";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Starburst } from "@/components/brand/Sticker";

export function Hero({ trip }: { trip: Trip }) {
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);

  return (
    <section className="relative isolate w-full overflow-hidden bg-mm-black text-mm-bone md:min-h-[100svh]">
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
      <div className="absolute right-4 top-20 z-20 md:hidden">
        <Starburst size={64} color="pink" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>
      <div className="absolute right-20 top-24 z-20 hidden md:block">
        <Starburst size={132} color="pink" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16 md:hidden">
        <div className="max-w-[13.25rem] pt-8">
          <h1 className="pr-4 font-display text-[clamp(2.6rem,14vw,3.7rem)] uppercase leading-[0.9] tracking-tight">
            <span className="block text-mm-bone">SOLO TRAVELLER?</span>
            <span className="block text-mm-pink">NOT FOR</span>
            <span className="block text-mm-lime">LONG.</span>
          </h1>

          <p className="mt-4 max-w-[16rem] text-[13px] leading-[1.15] text-mm-bone/90">
            For those with friends who never commit.<br />
            Trips that actually make it out the group chat.
          </p>
        </div>

        <div className="mt-6 w-full max-w-[21rem] border-mm-thick border-mm-black bg-mm-bone text-mm-black shadow-mm">
          <div className="flex items-stretch">
            <div className="flex-1 border-r-mm-thick border-mm-black px-3 py-2.5">
              <p className="font-sticker text-[9px] tracking-[0.18em] text-mm-black/70">FROM</p>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="font-display text-2xl leading-none">{formatPrice(headPrice)}</span>
                {headStrike ? (
                  <span className="mb-0.5 font-display text-xs text-mm-black/50 line-through">{formatPrice(headStrike)}</span>
                ) : null}
              </div>
              <p className="mt-0.5 max-w-[8.5rem] font-sticker text-[8px] leading-tight tracking-[0.16em] text-mm-black/70">
                {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
              </p>
            </div>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="h-auto min-h-0 flex-1 rounded-none bg-mm-orange px-3 py-2.5 font-display text-[1.05rem] leading-[1.05] text-mm-black hover:bg-mm-orange"
            >
              PICK YOUR<br />DATES →
            </Button>
          </div>
        </div>

        <p className="mt-5 max-w-[19rem] font-sticker text-[9px] tracking-[0.18em] text-mm-bone/80">
          REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
        </p>
      </div>

      {/* Desktop content stack */}
      <div className="relative z-10 mx-auto hidden min-h-[100svh] max-w-7xl grid-rows-[6rem_1fr_auto] px-12 pb-10 pt-0 md:grid">
        <div />

        <div className="flex flex-1 items-center">
          <div className="max-w-5xl">
            <h1 className="font-display uppercase leading-[0.88] tracking-tight text-[clamp(2.5rem,11vw,9rem)] md:leading-[0.86]">
              <span className="block text-mm-bone">SOLO<br className="md:hidden" /> TRAVELLER?</span>
              <span className="block text-mm-pink">NOT FOR</span>
              <span className="block text-mm-lime">LONG.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-snug text-mm-bone/90">
              For those with friends who never commit.<br />
              Trips that actually make it out the group chat.
            </p>
          </div>
        </div>

        {/* Bottom booking strip */}
        <div>
          <div className="w-full max-w-3xl border-mm-thick border-mm-black bg-mm-bone text-mm-black shadow-mm">
            <div className="flex items-stretch">
              <div className="flex-1 border-r-mm-thick border-mm-black px-3 py-2 md:px-5 md:py-4">
                <p className="font-sticker text-[9px] tracking-[0.18em] text-mm-black/70 md:text-[10px] md:tracking-[0.22em]">FROM</p>
                <div className="mt-0.5 flex items-end gap-2 md:mt-1 md:gap-3">
                  <span className="font-display text-2xl leading-none md:text-5xl">{formatPrice(headPrice)}</span>
                  {headStrike ? (
                    <span className="mb-0.5 font-display text-xs text-mm-black/50 line-through md:mb-1 md:text-lg">{formatPrice(headStrike)}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 font-sticker text-[8px] leading-tight tracking-[0.16em] text-mm-black/70 md:mt-1 md:text-[10px] md:tracking-[0.22em]">
                  {payInFull ? "PAY IN FULL" : "$99 DEPOSIT HOLDS YOUR SPOT"}
                </p>
              </div>
              <Button
                onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
                className="h-auto min-h-0 flex-1 rounded-none bg-mm-orange px-3 py-2 font-display text-sm leading-tight text-mm-black hover:bg-mm-orange md:min-h-[72px] md:px-4 md:text-xl"
              >
                PICK YOUR<br className="md:hidden" /> DATES →
              </Button>
            </div>
          </div>

          <p className="mt-3 font-sticker text-[9px] tracking-[0.2em] text-mm-bone/80 md:mt-8 md:text-[10px] md:tracking-[0.24em]">
            REAL MAD MONKEY HOSTELS IN EVERY CITY · 53,000+ IN OUR COMMUNITY
          </p>
        </div>
      </div>

      <PinnedWordmark />
    </section>
  );
}
