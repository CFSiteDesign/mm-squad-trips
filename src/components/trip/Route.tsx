import type { Trip } from "@/types/trip";

export function Route({ trip }: { trip: Trip }) {
  return (
    <section className="bg-muted/40 px-5 py-14">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-['Archivo_Black'] text-3xl">The route</h2>
        <ol className="mt-8 space-y-8">
          {trip.stops.map((stop, i) => (
            <li key={stop.name + i} className="relative pl-10">
              <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              {i < trip.stops.length - 1 && (
                <span className="absolute left-[15px] top-9 h-[calc(100%+1rem)] w-px bg-border" />
              )}
              <h3 className="text-lg font-bold">
                {stop.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {stop.nights} night{stop.nights === 1 ? "" : "s"}
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{stop.description}</p>
              {stop.photos?.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {stop.photos.map((p, j) => (
                    <img
                      key={j}
                      src={p}
                      alt={`${stop.name} ${j + 1}`}
                      className="h-32 w-48 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              {stop.activities?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {stop.activities.map((a) => (
                    <li
                      key={a}
                      className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-secondary"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
