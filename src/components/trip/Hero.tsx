import { Button } from "@/components/ui/button";
import { formatPrice, allDeparturesUnder60Days } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";

export function Hero({ trip }: { trip: Trip }) {
  const stopCount = trip.stops.length;
  const headPrice = trip.departures[0]?.price ?? trip.defaultPrice;
  const headStrike = trip.departures[0]?.strikethrough ?? trip.defaultStrikethrough;
  const payInFull = allDeparturesUnder60Days(trip.departures);

  return (
    <section className="relative isolate min-h-[88vh] w-full overflow-hidden bg-secondary text-white">
      {trip.heroVideoUrl && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={trip.heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          poster=""
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />
      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-2xl flex-col justify-end px-5 pb-10 pt-24">
        <h1 className="font-['Archivo_Black'] text-[clamp(2.4rem,9vw,4rem)] leading-[0.95] tracking-tight">
          Solo traveller?
          <br />
          Not for long.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/90">
          {trip.days} days · {stopCount} stops · {trip.activityCount} activities · One crew
        </p>

        <div className="mt-6 flex items-end gap-3">
          <span className="font-['Archivo_Black'] text-5xl text-accent">{formatPrice(headPrice)}</span>
          {headStrike && (
            <span className="mb-1 text-xl text-white/60 line-through">{formatPrice(headStrike)}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/80">
          {payInFull ? "Pay in full" : "$99 deposit holds your spot"}
        </p>

        <Button
          size="lg"
          className="mt-6 h-14 rounded-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90"
          onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
        >
          Pick your dates
        </Button>

        <p className="mt-8 text-xs uppercase tracking-wider text-white/70">
          Real Mad Monkey hostels in every city · 53,000+ in our community
        </p>
      </div>
    </section>
  );
}
