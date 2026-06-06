import { Sticker } from "@/components/brand/Sticker";

type Day = {
  day: string;
  weekday: string;
  location: string;
  date: string;
  highlights: string[];
};

const DAYS: Day[] = [
  {
    day: "Day 1",
    weekday: "SAT",
    location: "Uluwatu",
    date: "27/06",
    highlights: [
      "Arrive at Denpasar (DPS) Airport. Transfer to Mad Monkey Uluwatu.",
      "Welcome Sunset session (5PM–7:30PM) at Panorama Point Uluwatu.",
      "Get to know your group.",
    ],
  },
  {
    day: "Day 2",
    weekday: "SUN",
    location: "Uluwatu",
    date: "28/06",
    highlights: [
      "Mt Batur Sunrise Trekking (1:30AM–11AM).",
      "Relax and recharge using MM Sauna, hot tub and ice baths.",
      "Family dinner.",
    ],
  },
  {
    day: "Day 3",
    weekday: "MON",
    location: "Uluwatu → Nusa Lembongan",
    date: "29/06",
    highlights: [
      "Grab a taxi to Sanur, then a 30-min fast boat to Mad Monkey Nusa Lembongan.",
      "Enjoy our Mad Monkey Hostel facilities (ice baths, saunas, gym and our luxury pool).",
    ],
  },
  {
    day: "Day 4",
    weekday: "TUE",
    location: "Nusa Lembongan",
    date: "30/06",
    highlights: ["Watersports day (TBC)."],
  },
  {
    day: "Day 5",
    weekday: "WED",
    location: "Nusa Lembongan",
    date: "01/07",
    highlights: [
      "Island Hopping around Nusa Penida (8:30AM–5:00PM).",
      "Join the Mad Monkey Pool Party (6:00PM–10:00PM).",
    ],
  },
  {
    day: "Day 6",
    weekday: "THUR",
    location: "Nusa Lembongan → Gili T",
    date: "02/07",
    highlights: [
      "Early fast boat to Gili Trawangan. Check into Mad Monkey Gili T.",
      "Traditional Mexican Family Dinner.",
    ],
  },
  {
    day: "Day 7",
    weekday: "FRI",
    location: "Gili Trawangan",
    date: "03/07",
    highlights: [
      "Gili T Bucket List Bike Tour!",
      "Head back to Mad Monkey for Foam Party and Live DJ!",
    ],
  },
  {
    day: "Day 8",
    weekday: "SAT",
    location: "Gili T",
    date: "04/07",
    highlights: [
      "Mad Monkey Boat Party (2PM–6PM).",
      "Unlimited BBQ and drinks back at MM.",
    ],
  },
  {
    day: "Day 9",
    weekday: "SUN",
    location: "Gili T → Kuta Lombok",
    date: "05/07",
    highlights: [
      "Monkey See, Monkey Do snorkeling trip (10:30AM–4PM).",
      "Short boat to Lombok mainland, then shuttle to Mad Monkey Kuta Lombok.",
    ],
  },
  {
    day: "Day 10–12",
    weekday: "MON–WED",
    location: "Kuta Lombok",
    date: "06/07–08/07",
    highlights: [
      "SURF CAMP.",
      "Brekkie first, then hit the waves around 9–10AM — different beaches each day depending on conditions.",
      "Back for lunch and video analysis with your instructors (watch yourself eat it in slo-mo).",
      "Afternoon surf sesh, then nightly events. Rinse and repeat.",
    ],
  },
  {
    day: "Day 13",
    weekday: "WED",
    location: "Kuta Lombok",
    date: "09/07",
    highlights: ["Farewell and 30-min shuttle to Lombok Airport (LOP)."],
  },
];

export function IndonesiaItinerary({ days }: { days: number }) {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {days} DAYS.<br />
          <span className="text-mm-lime">DAY BY DAY.</span>
        </h2>

        <ol className="mt-8 space-y-7 md:mt-14 md:space-y-10">
          {DAYS.map((d, i) => (
            <li key={d.day} className="relative pl-12 md:pl-16">
              <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center border-[3px] border-mm-bone bg-mm-orange font-display text-[11px] leading-none text-mm-black md:h-12 md:w-12 md:text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              {i < DAYS.length - 1 && (
                <span className="absolute left-[16px] top-9 h-[calc(100%+1rem)] w-[3px] bg-mm-bone md:left-[22px] md:top-12" />
              )}

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-2xl text-mm-bone md:text-3xl">
                  {d.day.toUpperCase()}
                </h3>
                <span className="font-sticker text-[10px] tracking-[0.18em] text-mm-lime md:text-[11px]">
                  {d.weekday} · {d.date}
                </span>
              </div>
              <p className="mt-1 font-sticker text-[11px] tracking-[0.16em] text-mm-bone/80 md:text-xs">
                {d.location.toUpperCase()}
              </p>

              <ul className="mt-3 space-y-2">
                {d.highlights.map((h, k) => (
                  <li
                    key={k}
                    className="border-l-[3px] border-mm-bone/40 pl-3 text-[13px] leading-snug text-mm-bone/90 md:text-sm"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
