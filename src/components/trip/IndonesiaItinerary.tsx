import { useLocation } from "react-router-dom";
import { Sticker } from "@/components/brand/Sticker";
import uluwatuImg from "@/assets/indo-uluwatu-new.jpg";
import lembonganImg from "@/assets/indo-lembongan-new.jpg";
import giliImg from "@/assets/indo-gili-new.jpg";
import lombokImg from "@/assets/indo-kuta-new.jpg";
import stuNusaWelcome from "@/assets/student-nusa-welcome.png.asset.json";
import stuNusaSnorkel from "@/assets/student-nusa-snorkeling.jpg.asset.json";
import stuNusaPenida from "@/assets/student-nusa-penida.jpg.asset.json";
import stuGiliBar from "@/assets/student-gili-bar-photo.png.asset.json";
import stuGiliPoolParty from "@/assets/student-gili-t-pool-party.jpg.asset.json";
import stuGiliBoatParty from "@/assets/student-mad-monkey-boat-party-4.jpg.asset.json";
import stuGiliSnorkel from "@/assets/student-gili-snorkeling.jpg.asset.json";
import stuUluSpa from "@/assets/student-ulu-spa.png.asset.json";
import stuUluBatur from "@/assets/student-ulu-batur.jpg.asset.json";
import stuNusaPool from "@/assets/student-nusa-pool2.png.asset.json";
import stuGiliPool from "@/assets/student-gili-pool.jpeg.asset.json";
import stuNusa1 from "@/assets/student-nusa-1.png.asset.json";
import indoLombokAsset from "@/assets/indo-lombok.png.asset.json";

// The production site is served under the /all-in-trips path prefix, but
// Lovable asset JSON URLs are stored as origin-absolute (/__l5e/...). Prefix
// them at runtime when we're deployed under /all-in-trips.
const assetPrefix =
  typeof window !== "undefined" && window.location.pathname.startsWith("/all-in-trips")
    ? "/all-in-trips"
    : "";
const assetUrl = (u: string) => (u.startsWith("/") ? `${assetPrefix}${u}` : u);

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
      "Recover in the sauna, hot tub & ice bath",
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
      "Fast boat from Sanur to our clifftop hostel",
      "Pool, gym, sauna & ice bath days at Mad Monkey Lembongan",
      "Watersports day — pick your poison",
      "Island hopping around Nusa Penida (the iconic one)",
      "Mad Monkey pool party to close it out",
    ],
  },
  {
    num: "03",
    location: "Gili T",
    nights: "3 nights",
    image: giliImg,
    tag: "PARTY ISLAND",
    highlights: [
      "Early boat over, check into Mad Monkey Gili T",
      "Traditional Mexican family dinner",
      "Bucket List Bike Tour around the island",
      "Foam Party + Live DJ back at Mad Monkey",
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

type Day = {
  day: number;
  title: string;
  image: string;
  body: string;
  meals: string;
};

const DAYS: Day[] = [
  {
    day: 1,
    title: "Welcome to Uluwatu",
    image: assetUrl(stuUluSpa.url),
    body:
      "Land in Bali and make your way up to the clifftops of Uluwatu. The rest of the day's yours until we head out at 5pm for the welcome sunset at Panorama Point: the whole crew, a cold one in hand, and the coastline dropping into the ocean as the sky turns gold. Learn everyone's name over that first drink, then take it easy. Tomorrow starts in the dark, and it's one you won't want to sleep through.",
    meals: "None",
  },
  {
    day: 2,
    title: "Mount Batur sunrise hike",
    image: assetUrl(stuUluBatur.url),
    body:
      "The alarm goes at 1:30am and you'll thank us later. Trek up Mount Batur in the dark and hit the summit of an active volcano just as the sun breaks the horizon, cloud sitting in the valley below and the whole caldera lighting up. Back at the hostel to recover properly: sauna, hot tub, and an ice bath to bring the legs back to life. Then family dinner with a couple of drinks on us, and boozy bingo to see the night out.",
    meals: "Breakfast, Dinner",
  },
  {
    day: 3,
    title: "Welcome to Nusa",
    image: assetUrl(stuNusaPool.url),
    body:
      "Grab breakfast, check out, and by 1:30pm you're in a taxi to the coast and onto a fast boat over to Nusa Lembongan. This is where the pace drops and the water goes turquoise. Check into Mad Monkey and settle in: ice baths, saunas, a gym if you're feeling virtuous, and a pool that's very hard to leave. Tonight it's a beer pong tournament to get the island crew properly acquainted.",
    meals: "Breakfast",
  },
  {
    day: 4,
    title: "Swim with mantas",
    image: assetUrl(stuNusaSnorkel.url),
    body:
      "Out early for the big one: snorkelling with manta rays as they glide in off Nusa Penida, three or four metres wingtip to wingtip, cruising right under you. Back on dry land and the day's yours: beach, pool, hammock, repeat. Regroup at the hostel in the evening for family dinner and a few drinks with the crew.",
    meals: "Dinner",
  },
  {
    day: 5,
    title: "Nusa Penida",
    image: assetUrl(stuNusaPenida.url),
    body:
      "A full day island hopping around Nusa Penida from 8:30am. This is the Bali you've seen on the screensavers: Kelingking Beach and its dinosaur-shaped cliff, Broken Beach, water so clear it doesn't look real. Lunch is sorted along the way. Back to Mad Monkey for the pool party from 6pm, where the island properly lets loose.",
    meals: "Lunch",
  },
  {
    day: 6,
    title: "Over to Gili T",
    image: assetUrl(stuGiliBar.url),
    body:
      "Early fast boat across to Gili Trawangan: no cars, no scooters, just pushbikes, horse carts and sand. It's a bit of a walk from the pier in the heat, but there's an ice-cold beer and a pool waiting at the other end. Check into Mad Monkey, drop the bag and do as you please: beach, bar, or flat out by the water. Then it's our traditional Mexican family dinner to pull everyone back together.",
    meals: "Dinner",
  },
  {
    day: 7,
    title: "Explore Gili T",
    image: assetUrl(stuGiliPoolParty.url),
    body:
      "The Gili T bucket-list bike tour rolls out at 1pm: three hours looping the island, stopping wherever looks good, which is basically everywhere. Back to Mad Monkey by 3 and straight into the foam party with a live DJ running till 10. It's as messy as it sounds. Pace yourself, or don't.",
    meals: "None",
  },
  {
    day: 8,
    title: "The boat party",
    image: assetUrl(stuGiliBoatParty.url),
    body:
      "The one the whole island talks about. The Mad Monkey Boat Party kicks off at 2pm: four hours on the water, drinks flowing, DJs playing, everyone in. Roll back to the hostel by bike or on foot for an unlimited BBQ and more drinks to keep it rolling. One of those afternoons that doesn't really end.",
    meals: "Dinner",
  },
  {
    day: 9,
    title: "Monkey sea, monkey do",
    image: assetUrl(stuGiliSnorkel.url),
    body:
      "One last Gili morning, and it's a good one: the Monkey Sea, Monkey Do snorkelling trip from 10:30 to 4, out over the reefs and turtles in that ridiculous clear water. Lunch is included on the boat. Then a short crossing back to Lombok and a two-hour drive down to Mad Monkey Kuta Lombok, checking in around dinner. This is where you learn to surf.",
    meals: "Lunch",
  },
  {
    day: 10,
    title: "Surf camp begins",
    image: lombokImg,
    body:
      "Meet your surf instructors and the rest of the camp. The morning's for theory and drilling your pop-ups on the sand before you go near the water. Grab your welcome pack and merch, get lunch in with everyone, then paddle out for the real thing. Back to the hostel for family dinner and karaoke: surf camp bonds a group fast.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 11,
    title: "Dawn patrol",
    image: assetUrl(indoLombokAsset.url),
    body:
      "Run club for anyone up for starting the day moving. Breakfast first, then out for the morning surf: the beach changes day to day depending on where the swell's best. Back for lunch and photo analysis, where you watch yourself nail it, or eat it, in slow motion. Afternoon session, then a bonfire on the beach for sunset with a few cold ones.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 12,
    title: "Last waves",
    image: assetUrl(stuGiliPool.url),
    body:
      "Breakfast, then the morning surf one more time at whichever beach is firing. Back to the hostel for a pool party and a slow afternoon with a drink in hand. As the sun drops, head to the surf-skate meet-up, then back for the DJ party night: the last big one of the trip.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 13,
    title: "Onward",
    image: assetUrl(stuNusa1.url),
    body:
      "Goodbyes all round, then transfers to Lombok airport — grab whichever fits your flight. Mad Monkey doesn't really do goodbyes, though. Wherever you're headed next across Southeast Asia, there's a bunk with your name on it.",
    meals: "None",
  },
];

export function IndonesiaItinerary({ days }: { days: number }) {
  const { pathname } = useLocation();
  const isStudent = pathname.startsWith("/students");
  const headlineDays = isStudent ? 13 : days;

  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {headlineDays} DAYS.<br />
          <span className="text-mm-lime">FOUR STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          ULUWATU → NUSA LEMBONGAN → GILI T → KUTA LOMBOK
        </p>

        {isStudent ? (
          <ol className="mt-10 space-y-10 md:mt-16 md:space-y-14">
            {DAYS.map((d, i) => (
              <li
                key={d.day}
                className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10"
              >
                <div
                  className={`relative overflow-hidden border-[3px] border-mm-bone ${
                    i % 2 === 1 ? "md:order-2" : ""
                  }`}
                >
                  <img
                    src={d.image}
                    alt={d.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute left-3 top-3">
                    <Sticker color={i % 2 === 0 ? "pink" : "yellow"} rotate={-6}>
                      DAY {String(d.day).padStart(2, "0")}
                    </Sticker>
                  </div>
                </div>

                <div>
                  <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-lime md:text-[11px]">
                    DAY {d.day}
                  </p>
                  <h3 className="mt-2 font-display text-3xl leading-[1.02] text-mm-bone md:text-5xl">
                    {d.title.toUpperCase()}
                  </h3>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-mm-bone/90 md:text-[15px]">
                    {d.body}
                  </p>
                  <p className="mt-4 inline-block border-[3px] border-mm-bone/40 px-3 py-1 font-sticker text-[10px] tracking-[0.18em] text-mm-lime md:text-[11px]">
                    MEALS: {d.meals.toUpperCase()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
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
        )}
      </div>
    </section>
  );
}
