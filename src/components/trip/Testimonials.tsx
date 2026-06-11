import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Megan",
    age: 26,
    country: "UK",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    quote: "Made friends I'll travel with for the next decade.",
  },
  {
    name: "Lukas",
    age: 24,
    country: "Germany",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face",
    quote: "Came solo, left with 19 mates.",
  },
  {
    name: "Ava",
    age: 29,
    country: "Australia",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    quote: "Best two weeks of my year. Hands down.",
  },
  {
    name: "Jules",
    age: 23,
    country: "Canada",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    quote: "Zero awkwardness. Everyone's solo, everyone's keen.",
  },
];

export function Testimonials() {
  return (
    <section className="relative bg-mm-orange px-5 py-16 text-mm-black md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <span className="font-sticker text-[11px] tracking-[0.24em] text-mm-black/70">REVIEWS</span>
        <h2 className="mt-3 font-display text-[2.5rem] leading-[0.92] md:text-6xl">
          WHAT TRAVELLERS<br /><span className="text-mm-bone">ARE SAYING.</span>
        </h2>

        <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((r) => (
            <div
              key={r.name}
              className="block border-[3px] border-mm-black bg-mm-paper p-5 shadow-mm"
            >
              <div className="flex gap-1 text-mm-pink">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-snug text-mm-black">"{r.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <img
                  src={r.avatar}
                  alt={r.name}
                  loading="lazy"
                  className="h-10 w-10 rounded-full border-[3px] border-mm-black bg-mm-lime object-cover"
                />
                <div>
                  <div className="font-sticker text-[11px] tracking-[0.12em] text-mm-black">{r.name}</div>
                  <div className="text-xs text-mm-black/65">{r.age} · {r.country}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
