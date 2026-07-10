import { Sticker } from "@/components/brand/Sticker";
import giliImg from "@/assets/indo-gili-new.jpg";
import lombokImg from "@/assets/indo-kuta-new.jpg";

type Day = { day: number; title: string; image: string; body: string; meals: string };

const DAYS: Day[] = [
  {
    day: 1,
    title: "Welcome to Gili T",
    image: giliImg,
    body:
      "Arrive into Gili Trawangan and head to Mad Monkey. We're on the more secluded part of the island, so it's a bit of a walk from the pier, but there's an ice-cold beer and a pool waiting at the other end while you meet the crew. Check in, drop the bag and do as you please: beach, bar, or flat out by the water. Then join us for our traditional Mexican family dinner to kick off the trip.",
    meals: "Dinner",
  },
  {
    day: 2,
    title: "Explore Gili T",
    image: giliImg,
    body:
      "The Gili T bucket-list bike tour rolls out at 1pm: three hours looping the island, stopping wherever looks good, which is basically everywhere. Back to Mad Monkey by 3 and straight into the pool party with a live DJ running till 10. It's as messy as it sounds. Pace yourself, or don't.",
    meals: "None",
  },
  {
    day: 3,
    title: "The boat party",
    image: giliImg,
    body:
      "The one the whole island talks about. The Mad Monkey Boat Party kicks off at 2pm: four hours on the water, drinks flowing, DJs playing, everyone in. Roll back to the hostel by bike or on foot for an unlimited BBQ and more drinks to keep it rolling. One of those afternoons that doesn't really end.",
    meals: "Dinner",
  },
  {
    day: 4,
    title: "Monkey sea, monkey do",
    image: giliImg,
    body:
      "One last Gili morning, and it's a good one: the Monkey Sea, Monkey Do snorkelling trip from 10:30 to 4, out over the reefs and turtles in that ridiculous clear water. Lunch is included on the boat. Then a short crossing back to Lombok and a two-hour drive down to Mad Monkey Kuta Lombok, checking in around dinner. This is where you learn to surf.",
    meals: "Lunch",
  },
  {
    day: 5,
    title: "Surf camp begins",
    image: lombokImg,
    body:
      "Meet your surf instructors and the rest of the camp. The morning's for theory and drilling your pop-ups on the sand before you go near the water. Grab your welcome pack and merch, get lunch in with everyone, then paddle out for the real thing. Back to the hostel for family dinner and karaoke: surf camp bonds a group fast.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 6,
    title: "Dawn patrol",
    image: lombokImg,
    body:
      "Run club for anyone up for starting the day moving. Breakfast first, then out for the morning surf: the beach changes day to day depending on where the swell's best. Back for lunch and photo analysis, where you watch yourself nail it, or eat it, in slow motion. Afternoon session, then a bonfire on the beach for sunset with a few cold ones.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 7,
    title: "Last waves",
    image: lombokImg,
    body:
      "Breakfast, then the morning surf one more time at whichever beach is firing. Back to the hostel for a pool party and a slow afternoon with a drink in hand. As the sun drops, head to the surf-skate meet-up, then back for the DJ party night: the last big one of the trip.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 8,
    title: "Onward",
    image: lombokImg,
    body:
      "Goodbyes all round, then transfers to Lombok airport — grab whichever fits your flight. Mad Monkey doesn't really do goodbyes, though. Wherever you're headed next across Southeast Asia, there's a bunk with your name on it.",
    meals: "None",
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

        <ol className="mt-10 space-y-10 md:mt-16 md:space-y-14">
          {DAYS.map((d, i) => (
            <li key={d.day} className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10">
              <div className={`relative overflow-hidden border-[3px] border-mm-bone ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <img src={d.image} alt={d.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <div className="absolute left-3 top-3">
                  <Sticker color={i % 2 === 0 ? "pink" : "yellow"} rotate={-6}>
                    DAY {String(d.day).padStart(2, "0")}
                  </Sticker>
                </div>
              </div>
              <div>
                <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-lime md:text-[11px]">DAY {d.day}</p>
                <h3 className="mt-2 font-display text-3xl leading-[1.02] text-mm-bone md:text-5xl">{d.title.toUpperCase()}</h3>
                <p className="mt-4 text-[13.5px] leading-relaxed text-mm-bone/90 md:text-[15px]">{d.body}</p>
                <p className="mt-4 inline-block border-[3px] border-mm-bone/40 px-3 py-1 font-sticker text-[10px] tracking-[0.18em] text-mm-lime md:text-[11px]">
                  MEALS: {d.meals.toUpperCase()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
