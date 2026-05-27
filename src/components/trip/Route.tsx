import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";

export function Route({ trip }: { trip: Trip }) {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ROUTE</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {trip.days} DAYS.<br />
          <span className="text-mm-lime">{trip.stops.length} STOPS.</span>
        </h2>

        <ol className="mt-8 space-y-7 md:mt-14 md:space-y-10">
          {trip.stops.map((stop, i) => (
            <li key={stop.name + i} className="relative pl-12 md:pl-16">
              <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center border-[3px] border-mm-bone bg-mm-orange font-display text-base text-mm-black md:h-12 md:w-12 md:text-xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              {i < trip.stops.length - 1 && (
                <span className="absolute left-[16px] top-9 h-[calc(100%+1rem)] w-[3px] bg-mm-bone md:left-[22px] md:top-12" />
              )}
              <h3 className="font-display text-2xl text-mm-bone md:text-3xl">
                {stop.name.toUpperCase()}
                <span className="ml-2 font-sticker text-[10px] tracking-[0.18em] text-mm-lime md:ml-3 md:text-[11px]">
                  {stop.nights} NIGHT{stop.nights === 1 ? "" : "S"}
                </span>
              </h3>
              <p className="mt-2 text-[13px] leading-snug text-mm-bone/80 md:text-sm">{stop.description}</p>

              {stop.photos?.length > 0 ? (
                <div className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
                  {stop.photos.map((p, j) => (
                    <img
                      key={j}
                      src={p}
                      alt={`${stop.name} ${j + 1}`}
                      className="h-28 w-44 shrink-0 border-[3px] border-mm-bone object-cover shadow-mm-bone md:h-32 md:w-48"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex h-28 w-44 items-center justify-center border-[3px] border-mm-bone bg-mm-orange md:h-32 md:w-48">
                  <span className="font-display text-xs text-mm-black text-center px-2">PLACEHOLDER IMAGE</span>
                </div>
              )}


              {stop.activities?.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {stop.activities.map((a, k) => {
                    const tones = ["bg-mm-lime text-mm-black", "bg-mm-orange text-mm-black", "bg-mm-pink text-mm-black"];
                    return (
                      <li
                        key={a}
                        className={`border-[3px] border-mm-bone px-3 py-1 font-sticker text-[11px] tracking-wider ${tones[k % tones.length]}`}
                      >
                        {a}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
