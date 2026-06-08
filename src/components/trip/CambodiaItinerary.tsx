import { Sticker } from "@/components/brand/Sticker";

type Stop = {
  num: string;
  location: string;
  nights: string;
  imageColor: string;
  tag: string;
  highlights: string[];
};

const STOPS: Stop[] = [
  {
    num: "01",
    location: "Phnom Penh",
    nights: "3 nights",
    imageColor: "bg-mm-pink",
    tag: "WELCOME & HISTORY",
    highlights: [
      "Khmer family welcome dinner — meet the team from 6:30PM",
      "S21 & Killing Fields cultural tour — understand Cambodia's history",
      "Sunset boat cruise along the Mekong at 4:30PM",
      "Explore beautiful Phnom Penh by day",
      "End with a BBQ and pool party from 6PM",
    ],
  },
  {
    num: "02",
    location: "Siem Reap",
    nights: "3 nights",
    imageColor: "bg-mm-cyan",
    tag: "TEMPLES & NIGHTLIFE",
    highlights: [
      "Bus from Phnom Penh at 10AM, arrive 6PM — make your own pizza night at 7:30PM",
      "Relax and recharge before the messy pub crawl at 8PM",
      "Floating Village Tour from 2PM–7:30PM + Bingo for a Cause at 8PM",
      "Angkor Wat sunrise tour 4:30AM–12:30PM (ticket purchased on-site with ID)",
      "Overnight bus departs to Sihanoukville at 7:30PM",
    ],
  },
  {
    num: "03",
    location: "Koh Rong",
    nights: "3 nights",
    imageColor: "bg-mm-lime",
    tag: "ISLAND VIBES & RAVES",
    highlights: [
      "Arrive Sihanoukville at 7AM, BuvaSea ferry at 8:30AM to Koh Rong",
      "Explore beautiful Koh Rong, then Caribbean dinner at 7PM",
      "Beach Olympics at Mad Monkey 2:30PM–4:30PM",
      "Nestival beach/jungle rave from 7PM until sunrise",
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
      "Koh Sdach Loop 4PM–6PM: e-bike the island, beers, and sunset",
      "Sunset Boat Cruise 4PM–6:30PM + Pub Quiz",
      "Kayak hire on crystal-clear water anytime 8AM–5PM (1 hour rental)",
      "Farewell dinner ($10 F+B required)",
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
