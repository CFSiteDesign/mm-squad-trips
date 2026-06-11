import { Star } from "lucide-react";
import miaImg from "@/assets/mia.jpg.asset.json";
import willImg from "@/assets/will.jpg.asset.json";
import astonImg from "@/assets/aston.jpg.asset.json";
import sofiaImg from "@/assets/sofia.jpg.asset.json";

const TESTIMONIALS = [
  {
    name: "Mia",
    handle: "mia.fryx",
    trip: "Mad Monkey Trip",
    avatar: miaImg.url,
    quote: "I met 15 amazing girls who will be friends for life. There is no going back once you do a monkey trip — also every hostel had this crazy view!",
  },
  {
    name: "Will",
    handle: "willroth01",
    trip: "Cambodia",
    avatar: willImg.url,
    quote: "Mad monkey trips are mad. The biggest jokes I had the whole time — doing it again next week in Cambodia too.",
  },
  {
    name: "Aston",
    handle: "astonsweetman",
    trip: "Ha Giang Loop",
    avatar: astonImg.url,
    quote: "I had an amazing experience on the Ha Giang Loop group tour. My driver was incredibly kind and professional. I felt safe every second, which let me fully relax and enjoy the journey.",
  },
  {
    name: "Sofia",
    handle: "sofia_joon772",
    trip: "Vietnam",
    avatar: sofiaImg.url,
    quote: "Booked the Vietnam tour solo and was so nervous, but I'd met half the group within an hour. Ended up with 15 new friends and a chat that still hasn't gone quiet. They even surprised us with an upgrade on the last day. If you're thinking of doing it solo — just book it. 10/10.",
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
            <a
              key={r.handle}
              href={`https://www.instagram.com/${r.handle}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block border-[3px] border-mm-black bg-mm-paper p-5 shadow-mm transition-transform hover:-translate-y-1"
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
                  <div className="font-sticker text-[11px] tracking-[0.12em] text-mm-black group-hover:underline">@{r.handle}</div>
                  <div className="text-xs text-mm-black/65">{r.trip}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
