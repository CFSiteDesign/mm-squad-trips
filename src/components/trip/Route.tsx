import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";

export function Route({ trip }: { trip: Trip }) {
  return (
    <section className="relative bg-mm-black px-6 py-20 text-mm-bone">
      <div className="mx-auto max-w-3xl">
        <Sticker color="cyan" rotate={3}>THE ROUTE</Sticker>
        <h2 className="mt-4 font-display text-5xl md:text-6xl text-mm-bone">
          {trip.days} DAYS.<br />
          <span className="text-mm-lime">{trip.stops.length} STOPS.</span>
        </h2>

        <ol className="mt-12 space-y-8">
          {trip.stops.map((stop, i) => (
            <li key={stop.name + i} className="relative pl-16">
              <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center border-[3px] border-mm-bone bg-mm-orange font-display text-xl text-mm-black">
                {String(i + 1).padStart(2, "0")}
              </span>
              {i < trip.stops.length - 1 && (
                <span className="absolute left-[22px] top-12 h-[calc(100%+1rem)] w-[3px] bg-mm-bone" />
              )}
              <h3 className="font-display text-3xl text-mm-bone">
                {stop.name.toUpperCase()}
                <span className="ml-3 font-sticker text-[11px] tracking-[0.18em] text-mm-lime">
                  {stop.nights} NIGHT{stop.nights === 1 ? "" : "S"}
                </span>
              </h3>
              <p className="mt-2 text-sm text-mm-bone/80">{stop.description}</p>

              {stop.photos?.length > 0 ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {stop.photos.map((p, j) => (
                    <img
                      key={j}
                      src={p}
                      alt={`${stop.name} ${j + 1}`}
                      className="h-32 w-48 shrink-0 border-[3px] border-mm-bone object-cover shadow-mm-bone"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex h-32 w-48 items-center justify-center border-[3px] border-mm-bone bg-mm-orange">
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
