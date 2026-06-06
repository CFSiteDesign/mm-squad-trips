import { Sticker } from "@/components/brand/Sticker";
import uluwatuImg from "@/assets/indo-uluwatu.jpg";
import lembonganImg from "@/assets/indo-lembongan.jpg";
import giliImg from "@/assets/indo-hero.jpg.asset.json";
import lombokImg from "@/assets/indo-lombok.jpg";

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
    location: "Uluwatu",
    nights: "2 nights",
    image: uluwatuImg,
    tag: "CLIFFS & SUNSETS",
    highlights: [
      "Land in Bali, transfer straight to Mad Monkey Uluwatu",
      "Welcome sunset session at Panorama Point — meet the crew",
      "Pre-dawn Mt Batur sunrise trek (worth the alarm)",
      "Recover in the sauna, hot tub & ice baths",
      "Family dinner to seal the squad",
    ],
  },
  {
    num: "02",
    location: "Nusa Lembongan",
    nights: "3 nights",
    image: lembonganImg,
    tag: "ISLAND LIFE",
    highlights: [
      "Fast boat from Sanur to our beachside hostel",
      "Pool, gym, sauna & ice bath days at MM Lembongan",
      "Watersports day — pick your poison",
      "Island hopping around Nusa Penida (the iconic one)",
      "Mad Monkey pool party to close it out",
    ],
  },
  {
    num: "03",
    location: "Gili T",
    nights: "3 nights",
    image: giliImg.url,
    tag: "PARTY ISLAND",
    highlights: [
      "Early boat over, check into Mad Monkey Gili T",
      "Traditional Mexican family dinner",
      "Bucket List Bike Tour around the island",
      "Foam Party + Live DJ back at MM",
      "Boat Party (2–6PM) → unlimited BBQ & drinks after",
      "Monkey See, Monkey Do snorkel trip on the way out",
    ],
  },
  {
    num: "04",
    location: "Kuta Lombok",
    nights: "4 nights",
    image: lombokImg,
    tag: "SURF CAMP",
    highlights: [
      "Brekkie, then waves around 9–10AM — new beach each day",
      "Lunch + video analysis (watch yourself eat it in slo-mo)",
      "Afternoon surf sesh, nightly events, rinse & repeat",
      "Farewell, then 30-min shuttle to Lombok Airport",
    ],
  },
];

export function IndonesiaItinerary({ days }: { days: number }) {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {days} DAYS.<br />
          <span className="text-mm-lime">FOUR STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          BALI → LEMBONGAN → GILI T → LOMBOK
        </p>

        <ol className="mt-10 space-y-10 md:mt-16 md:space-y-16">
          {STOPS.map((s, i) => (
            <li
              key={s.num}
              className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10"
            >
              {/* Image */}
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
