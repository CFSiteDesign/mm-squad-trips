import { Button } from "@/components/ui/button";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { PinnedWordmark } from "@/components/brand/Wordmark";
import { Sticker, Starburst } from "@/components/brand/Sticker";

export function Hero({ trip }: { trip: Trip }) {
  const stopCount = trip.stops.length;
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);

  return (
    <section className="relative isolate min-h-[92vh] w-full overflow-hidden bg-mm-black text-mm-bone">
      {trip.heroVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          src={trip.heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        // brand-coloured placeholder block (real Mad Monkey photo goes here)
        <div className="absolute inset-0 bg-mm-orange" />
      )}
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

      {/* Brand devices */}
      <div className="absolute right-6 top-8 z-20">
        <Sticker color="lime" rotate={-6}>ALL · IN</Sticker>
      </div>
      <div className="absolute left-6 bottom-44 z-20 md:left-12 md:bottom-32">
        <Starburst size={132} color="yellow" rotate={-12}>
          {trip.days}<br />DAYS
        </Starburst>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-3xl flex-col justify-end px-6 pb-16 pt-28 md:px-10">
        <p className="font-sticker text-xs text-mm-lime">{trip.name.toUpperCase()}</p>
        <h1 className="mt-3 font-display text-[clamp(3rem,12vw,7rem)] text-mm-bone">
          SOLO?<br />
          <span className="text-mm-orange">NOT</span> FOR<br />LONG.
        </h1>
        <p className="mt-5 font-sticker text-[11px] tracking-[0.18em] text-mm-bone/85">
          {trip.days} DAYS · {stopCount} STOPS · {trip.activityCount} ACTIVITIES · ONE CREW
        </p>

        <div className="mt-7 inline-flex items-end gap-4 border-mm-thick border-mm-bone bg-mm-black px-4 py-3 shadow-mm-bone w-fit">
          <span className="font-display text-5xl text-mm-lime md:text-6xl">{formatPrice(headPrice)}</span>
          {headStrike ? (
            <span className="mb-1 font-display text-xl text-mm-bone/60 line-through">{formatPrice(headStrike)}</span>
          ) : null}
        </div>
        <p className="mt-3 font-sticker text-[11px] tracking-[0.18em] text-mm-bone/80">
          {payInFull ? "PAY IN FULL" : "$99 HOLDS YOUR SPOT"}
        </p>

        <Button
          size="lg"
          className="mt-7 h-14 w-full max-w-sm rounded-none border-[3px] border-mm-black bg-mm-lime font-display text-base text-mm-black shadow-mm hover:bg-mm-lime hover:-translate-x-[2px] hover:-translate-y-[2px] transition-transform"
          onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
        >
          PICK YOUR DATES →
        </Button>

        <p className="mt-10 font-sticker text-[10px] tracking-[0.25em] text-mm-bone/70">
          REAL MAD MONKEY HOSTELS · 53,000+ IN THE CREW
        </p>
      </div>

      <PinnedWordmark tone="light" />
    </section>
  );
}
