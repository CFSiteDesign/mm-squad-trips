import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";

export function WhosComing({ trip }: { trip: Trip }) {
  return (
    <section className="relative bg-mm-bone px-6 py-20 text-mm-black">
      <div className="mx-auto max-w-3xl">
        <Sticker color="pink" rotate={-3}>WHO&apos;S COMING</Sticker>
        <h2 className="mt-4 font-display text-5xl md:text-6xl">
          YOUR<br />
          <span className="text-mm-pink">NEW CREW.</span>
        </h2>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="border-[3px] border-mm-black bg-mm-black px-4 py-2 font-sticker text-[11px] text-mm-bone tracking-[0.18em] shadow-mm-sm">
            MOST GUESTS 23–31
          </span>
          <span className="border-[3px] border-mm-black bg-mm-lime px-4 py-2 font-sticker text-[11px] text-mm-black tracking-[0.18em] shadow-mm-sm">
            82% COME SOLO
          </span>
        </div>

        {trip.videoTestimonialUrl && (
          <video
            src={trip.videoTestimonialUrl}
            controls
            playsInline
            className="mt-8 w-full border-mm-thick bg-mm-black shadow-mm-lg"
          />
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {trip.testimonials.slice(0, 4).map((t, i) => {
            const bg = ["bg-mm-orange", "bg-mm-lime", "bg-mm-orange", "bg-mm-lime"][i % 4];
            return (
              <figure key={t.name} className={`border-mm-thick ${bg} p-5 shadow-mm`}>
                <blockquote className="font-display text-lg leading-tight text-mm-black">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {t.photo ? (
                    <img src={t.photo} alt={t.name} className="h-10 w-10 border-[3px] border-mm-black object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center border-[3px] border-mm-black bg-mm-black font-display text-[9px] text-mm-bone leading-tight text-center">
                      PLACEHOLDER IMAGE
                    </div>
                  )}
                  <div className="font-sticker text-[10px] tracking-[0.18em] text-mm-black">
                    {t.name} · {t.age} · {t.country}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
