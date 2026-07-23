import { Sticker } from "@/components/brand/Sticker";
import giliImg from "@/assets/indo-gili-new.jpg";
import lombokImg from "@/assets/indo-kuta-new.jpg";

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
    location: "Gili T",
    nights: "3 nights",
    image: giliImg,
    tag: "PARTY ISLAND",
    highlights: [
      "Arrive into Gili Trawangan, check into Mad Monkey, meet the crew",
      "Traditional Mexican family dinner to kick off the trip",
      "Bucket List Bike Tour looping the island",
      "Pool party with a live DJ running till late",
      "Mad Monkey Boat Party (2–6PM) → unlimited BBQ & drinks after",
      "Monkey Sea, Monkey Do snorkel trip on the way out",
    ],
  },
  {
    num: "02",
    location: "Kuta Lombok",
    nights: "4 nights",
    image: lombokImg,
    tag: "SURF CAMP",
    highlights: [
      "Short crossing back to Lombok, transfer down to Kuta Lombok",
      "Surf camp kicks off: theory, pop-ups, then paddle out for real",
      "Morning + afternoon sessions at whichever beach is firing",
      "Lunch + video analysis (watch yourself eat it in slo-mo)",
      "Beach bonfires, pool parties, surf-skate meet-ups & DJ nights",
      "Farewell, then transfers to Lombok Airport",
    ],
  },
];

export function Indonesia7Itinerary() {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          7 DAYS.<br />
          <span className="text-mm-lime">TWO STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          GILI T → KUTA LOMBOK
        </p>

        <ol className="mt-10 space-y-10 md:mt-16 md:space-y-16">
          {STOPS.map((s, i) => (
            <li
              key={s.num}
              className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10"
            >
              <div
                className={`relative overflow-hidden border-[3px] border-mm-bone ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <img
                  src={s.image}
                  alt={s.location}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
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
