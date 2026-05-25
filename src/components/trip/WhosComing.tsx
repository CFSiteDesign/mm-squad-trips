import type { Trip } from "@/types/trip";

export function WhosComing({ trip }: { trip: Trip }) {
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-['Archivo_Black'] text-3xl">Who's coming</h2>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Most guests 23–31
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            82% of guests come solo
          </span>
        </div>
        {trip.videoTestimonialUrl && (
          <video
            src={trip.videoTestimonialUrl}
            controls
            playsInline
            className="mt-6 w-full rounded-xl bg-black"
          />
        )}


        <div className="mt-6 space-y-4">
          {trip.testimonials.slice(0, 4).map((t) => (
            <figure key={t.name} className="rounded-xl border border-border bg-card p-4">
              <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
              <figcaption className="mt-3 flex items-center gap-3">
                <img src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{t.name}</strong>, {t.age} · {t.country}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
