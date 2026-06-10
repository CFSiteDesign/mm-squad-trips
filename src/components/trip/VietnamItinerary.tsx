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
    location: "Hanoi",
    nights: "2 nights",
    imageColor: "bg-mm-pink",
    tag: "OLD QUARTER & HIDDEN ALLEYS",
    highlights: [
      "Touch down in the chaos of the Old Quarter",
      "Bia Hoi and 'Happy Water' at a street-side haunt",
      "Walking tour to secret shopping spots and landmarks",
      "Free beer at 18:30 in the hostel to relaunch the party",
    ],
  },
  {
    num: "02",
    location: "Lan Ha Bay",
    nights: "1 night",
    imageColor: "bg-mm-cyan",
    tag: "LIMESTONE PARADISE",
    highlights: [
      "Trade city streets for turquoise water and sun-drenched decks",
      "Exclusive Mad Monkey floating party — nowhere else like it",
      "Overnight on the bay surrounded by karst peaks",
    ],
  },
  {
    num: "03",
    location: "Hanoi",
    nights: "1 night",
    imageColor: "bg-mm-lime",
    tag: "THE WHITE PARTY",
    highlights: [
      "Return from the bay for the iconic Mad Monkey White Party",
      "Two hours of free-flow Halida and house mixers",
      "Live DJ and a massive pub crawl to cement the squad bond",
    ],
  },
  {
    num: "04",
    location: "Ha Giang Loop",
    nights: "5 nights",
    imageColor: "bg-mm-orange",
    tag: "MOUNTAIN ADVENTURE",
    highlights: [
      "Basecamp at the foot of the loop — poolside beers and mountain views",
      "Du Gia waterfalls and free-flow beers in a remote mountain homestay",
      "Ma Pi Leng Pass and the Skywalk — best views in Southeast Asia",
      "Push to Lung Cu, Vietnam's 'North Pole', and frontier village Nam Dam",
      "Vietnam vs. The World football match with local guides",
      "Ride the Tham Ma Pass — the most 'Instagrammable' road in the country",
    ],
  },
  {
    num: "05",
    location: "Ninh Binh",
    nights: "1 night",
    imageColor: "bg-mm-yellow",
    tag: "HA LONG ON LAND",
    highlights: [
      "Explore caves and rafts in 'Ha Long Bay on Land'",
      "Sunset from the top of Mua Cave",
      "Board the VIP sleeper cabin for an overnight journey to the coast",
    ],
  },
  {
    num: "06",
    location: "Hoi An & Da Nang",
    nights: "3 nights",
    imageColor: "bg-mm-purple",
    tag: "LANTERNS & GOLDEN BRIDGES",
    highlights: [
      "Professional cooking class in beautiful Hoi An",
      "Spin through the palms on the TikTok-famous coconut boats",
      "Visit the 'Hands of God' Golden Bridge",
      "Explore the mountain top French Village Ba Na Hills",
      "Cycle through serene rice paddies",
      "Final night Hot Pot feast and a last round of Happy Water",
    ],
  },
];

export function VietnamItinerary({ days }: { days: number }) {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {days} DAYS.<br />
          <span className="text-mm-lime">SIX STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          HANOI → LAN HA BAY → HA GIANG → NINH BINH → HOI AN
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
