import { Sticker } from "@/components/brand/Sticker";
import phnomImg from "@/assets/kh-phnom.jpg.asset.json";
import siemImg from "@/assets/kh-siemreap.jpg.asset.json";
import kohRongImg from "@/assets/kh-kohrong.jpg.asset.json";
import kohSdachImg from "@/assets/kh-kohsdach.png.asset.json";

type Stop = {
  num: string;
  location: string;
  nights: string;
  image: string;
  tag: string;
  highlights: string[];
};

const STOPS: Stop[] = [
  {
    num: "01",
    location: "Phnom Penh",
    nights: "3 nights",
    image: phnomImg.url,
    tag: "WELCOME & HISTORY",
    highlights: [
      "Khmer family welcome dinner — meet the team",
      "S21 & Killing Fields — understand Cambodia's history",
      "Sunset boat cruise along the Mekong",
      "Explore beautiful Phnom Penh by day",
      "End with a BBQ and pool party",
    ],
  },
  {
    num: "02",
    location: "Siem Reap",
    nights: "3 nights",
    image: siemImg.url,
    tag: "TEMPLES & NIGHTLIFE",
    highlights: [
      "Bus from Phnom Penh — make your own pizza night",
      "Relax and recharge before the messy pub crawl",
      "Floating Village Tour + Bingo for a Cause",
      "Angkor Wat sunrise tour (ticket purchased on-site with ID)",
      "Overnight bus departs to Sihanoukville",
    ],
  },
  {
    num: "03",
    location: "Koh Rong",
    nights: "3 nights",
    imageColor: "bg-mm-lime",
    tag: "ISLAND VIBES & RAVES",
    highlights: [
      "BuvaSea ferry to Koh Rong",
      "Explore beautiful Koh Rong, then Caribbean dinner",
      "Beach Olympics at Mad Monkey",
      "Nestival beach/jungle rave until sunrise",
      "Day of relaxation on the beach + BBQ and fireshow",
    ],
  },
  {
    num: "04",
    location: "Koh Sdach",
    nights: "3 nights",
    imageColor: "bg-mm-orange",
    tag: "WELLNESS & ADVENTURE",
    highlights: [
      "Hour boat to Koh Sdach Mad Monkey — spa amenities and Wellness Challenge",
      "Koh Sdach Loop: e-bike the island, beers, and sunset",
      "Sunset Boat Cruise + Pub Quiz",
      "Kayak hire on crystal-clear water (1 hour rental)",
      "Farewell dinner",
    ],
  },
];

export function CambodiaItinerary({ days }: { days: number }) {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {days} DAYS.<br />
          <span className="text-mm-lime">FOUR STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          PHNOM PENH → SIEM REAP → KOH RONG → KOH SDACH
        </p>

        <ol className="mt-10 space-y-10 md:mt-16 md:space-y-16">
          {STOPS.map((s, i) => (
            <li
              key={s.num}
              className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10"
            >
              {/* Image placeholder */}
              <div
                className={`relative overflow-hidden border-[3px] border-mm-bone ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <div className={`aspect-[4/3] w-full ${s.imageColor} flex items-center justify-center`}>
                  <span className="font-display text-2xl text-mm-black md:text-4xl">
                    {s.location.toUpperCase()}
                  </span>
                </div>
                <div className="absolute left-3 top-3">
                  <Sticker color={i % 2 === 0 ? "pink" : "yellow"} rotate={-6}>
                    STOP {s.num}
                  </Sticker>
                </div>
                <div className="absolute bottom-3 right-3">
                  <Sticker color="lime" rotate={4}>
                    {s.nights.toUpperCase()}
                  </Sticker>
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-lime md:text-[11px]">
                  {s.tag}
                </p>
                <h3 className="mt-2 font-display text-4xl leading-none text-mm-bone md:text-6xl">
                  {s.location.toUpperCase()}
                </h3>
                <ul className="mt-5 space-y-2.5">
                  {s.highlights.map((h, k) => (
                    <li
                      key={k}
                      className="flex gap-3 border-l-[3px] border-mm-bone/40 pl-3 text-[13px] leading-snug text-mm-bone/90 md:text-sm"
                    >
                      <span className="font-sticker text-mm-pink">▸</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
