import { Sticker } from "@/components/brand/Sticker";
import hanoiImg from "@/assets/vn-hanoi.jpg";
import hanoi2Img from "@/assets/vn-hanoi2.jpg";
import lanhaImg from "@/assets/vn-lanha.jpg";
import hagiangImg from "@/assets/vn-hagiang.jpg";
import ninhbinhImg from "@/assets/vn-ninhbinh.jpg";
import hoianImg from "@/assets/vn-hoian.jpg";

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
    title: "Welcome to Hanoi",
    image: hanoiImg,
    body:
      "Land in Hanoi, drop your bag and the day's yours until the evening. Then it kicks off. A welcome drink at the hostel to meet the crew, before we pour out into the Old Quarter for bia hoi and street food. By the end of the night you'll know everyone's name. Still got legs? There's karaoke and a pub crawl down Hanoi's famous beer street.",
    meals: "Dinner",
  },
  {
    day: 2,
    title: "Hanoi on foot",
    image: hanoi2Img,
    body:
      "Get under the skin of the city with our local crew leading the way. Hoan Kiem Lake, St. Joseph's Cathedral, a proper egg coffee, and a finish at Train Street as the carriages rattle past inches from your cup. The rest of the day is open. Jump on the music quiz and pub crawl, or take the evening to roam Hanoi at your own pace.",
    meals: "Breakfast",
  },
  {
    day: 3,
    title: "Lan Ha Bay",
    image: lanhaImg,
    body:
      "Out the door at 8am and onto the water at Lan Ha Bay, Halong's quieter, wilder neighbour. Days are for swimming straight off the boat, tubing and beach volleyball. Come sunset the boat party starts and the limestone towers turn gold. Tonight you're sleeping on board, anchored in the middle of the bay.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 4,
    title: "Lan Ha Bay + the White Party",
    image: lanhaImg,
    body:
      "Wake up on the water, breakfast on deck, then out in the kayaks through hidden lagoons. Local lunch, then we roll back to Hanoi for the White Party. Two hours of free-flow beer and live DJs. Still standing at midnight? Beer street is a stumble away.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 5,
    title: "Into the mountains",
    image: hagiangImg,
    body:
      "Set off towards Ha Giang city on our VIP Cabin Bus. Spend the afternoon by the pool with a welcome drink and big mountain views, getting to know the crew you'll share the next four days with. Come evening, your Tour Leader and Easy Riders join for dinner, with stories from the road and a taste of what's coming. Dinner at the retreat is an optional add-on (200,000 VND).",
    meals: "Breakfast",
  },
  {
    day: 6,
    title: "Ha Giang Loop begins",
    image: hagiangImg,
    body:
      "Wake up in Ha Giang, grab your crew and point the bikes at the mountains. Today is all first views, winding passes and waterfalls you didn't see coming. Dramatic roads, tiny villages, and the sound of engines rolling down the valleys. You'll stop every twenty minutes because the views are ridiculous. The night lands family-style in Du Gia: shared dinner, karaoke, happy water and underground bars, with people who already feel like old mates.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 7,
    title: "Ma Pi Leng",
    image: hagiangImg,
    body:
      "This is the day people talk about for years. Bigger mountains, wilder roads, and the legendary Ma Pi Leng Pass, cliffside tarmac with the Nho Que River carving the canyon far below. Every corner looks unreal. Every stop somehow tops the last. By the time you're cracking sunset beers in Dong Van, normal life feels a world away.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 8,
    title: "To the top of Vietnam",
    image: hagiangImg,
    body:
      "Culture, history and some of the most iconic scenery on the Loop. Ride to Lung Cu Flag Tower, the very top of Vietnam, then look across the border into China, and wander ancient villages where kids wave from the roadside. Then a football match with your Easy Riders gets gloriously chaotic, before one big farewell dinner brings the crew together.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 9,
    title: "Last ride home",
    image: hagiangImg,
    body:
      "One last morning in the mountains before the ride home through hidden roads, jungle passes and a secret waterfall or two. By now the group feels like family and nobody's ready for it to end. Music in the helmets, tired eyes, camera rolls full. One last cheers before rolling back into Ha Giang already planning the next one. Back in Hanoi for around 11pm.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 10,
    title: "Ninh Binh, then south",
    image: ninhbinhImg,
    body:
      "Swap the city for the countryside on a full day in Ninh Binh. They call it Halong Bay on land, and one glide through Tam Coc on a sampan tells you why. Cycle the rice-paddy backroads, then row through three river caves: Hang Ca, Hang Hai and Hang Ba. Around 5:30pm you board the VIP cabin sleeper bus south to Hoi An, with plenty of stops for snacks, dinner and a leg stretch on the way.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 11,
    title: "Hoi An pool party",
    image: hoianImg,
    body:
      "Roll into Hoi An early and ease in poolside. Around 4pm the sunset pool party kicks off. Free beer, happy-hour cocktails, an all-you-can-eat BBQ and live DJs by the water. Up for a big one? The free shuttle runs you straight into town for Hoi An's nightlife.",
    meals: "Dinner",
  },
  {
    day: 12,
    title: "Hoi An by bike",
    image: hoianImg,
    body:
      "Out at 11am on a cycle tour through old Hoi An, taking in a lantern-making workshop, the Rehahn gallery, the Japanese Bridge, an ancient house and a stop with a local tailor. Back to the hostel for an ice-cold beer and a bowl of cao lao noodles. The afternoon's yours: laze by the pool, or hit An Bang Beach for the waves and the sunset. Then dance it out before the pub crawl heads into town.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 13,
    title: "One last sunset",
    image: hoianImg,
    body:
      "Last full day, and it's a good one. Out around 8am to a local market and into the coconut mangroves by bamboo basket boat, then a two-hour cooking class where a local chef walks you through spring rolls, bánh xèo and phở, and you eat the lot. At 4pm the sunset river cruise sets sail as the sky turns gold, with five free drinks in hand and a boat full of backpackers up for a good time. After that, the last night is yours. Go big with the crew one final time, or wind it down with a cold one under the lanterns. However you want to round off two weeks in Vietnam.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 14,
    title: "Onward",
    image: hoianImg,
    body:
      "One last breakfast, goodbyes all round, and you're off. Nearest airport is Danang. We can support with booking transfers, just ask at reception. Mad Monkey doesn't really do goodbyes, though. Wherever you're headed next across Southeast Asia, there's a bunk with your name on it.",
    meals: "Breakfast",
  },
];

type Stop = {
  index: number;
  name: string;
  nights: string;
  image: string;
  body: string;
  meals: string;
};

const STOPS: Stop[] = [
  {
    index: 1,
    name: "Hanoi",
    nights: "2 nights",
    image: hanoiImg,
    body:
      "Land in the capital and dive straight into the chaos. Welcome drinks at the hostel, then out into the Old Quarter for bia hoi, street food and karaoke down Hanoi's famous beer street. Day two it's Hoan Kiem Lake, St. Joseph's Cathedral, egg coffee and Train Street as the carriages rattle past your cup, with a music quiz and pub crawl waiting if you've still got legs.",
    meals: "1 dinner, 1 breakfast",
  },
  {
    index: 2,
    name: "Lan Ha Bay",
    nights: "1 night on the boat",
    image: lanhaImg,
    body:
      "Out to Halong's quieter, wilder neighbour for two days on the water. Swimming straight off the boat, tubing, beach volleyball, then a sunset boat party as the limestone karsts turn gold. Sleep on board anchored in the middle of the bay, kayak through hidden lagoons at sunrise, then roll back to Hanoi for the White Party — two hours of free-flow beer and live DJs.",
    meals: "2 breakfasts, 2 lunches, 1 dinner",
  },
  {
    index: 3,
    name: "Ha Giang Loop",
    nights: "4 nights",
    image: hagiangImg,
    body:
      "The big one. Four days riding the most ridiculous roads in Southeast Asia with your own Easy Rider. Cliffside passes, hidden waterfalls and the legendary Ma Pi Leng above the Nho Que canyon. Family-style dinners in Du Gia, happy water and karaoke with the crew, a football match that gets gloriously chaotic, and the top of Vietnam at Lung Cu Flag Tower looking over into China. Back to Hanoi late on night four.",
    meals: "4 breakfasts, 4 lunches, 4 dinners",
  },
  {
    index: 4,
    name: "Ninh Binh",
    nights: "Day trip + sleeper bus",
    image: ninhbinhImg,
    body:
      "Halong Bay on land. Glide through Tam Coc on a sampan, cycle the rice-paddy backroads, then row through the three river caves of Hang Ca, Hang Hai and Hang Ba. Around 5:30pm you board the VIP cabin sleeper bus south to Hoi An, with stops for snacks, dinner and a leg stretch on the way.",
    meals: "1 breakfast, 1 lunch",
  },
  {
    index: 5,
    name: "Hoi An",
    nights: "3 nights",
    image: hoianImg,
    body:
      "Roll in early and ease in poolside before the sunset pool party kicks off with free beer, happy-hour cocktails, all-you-can-eat BBQ and live DJs. Cycle tour through the old town for a lantern-making workshop, the Japanese Bridge and a tailor stop, then a cooking class in the coconut mangroves and a sunset river cruise with five free drinks in hand. Nearest airport for onward travel is Danang.",
    meals: "3 breakfasts, 2 lunches, 1 dinner",
  },
];

export function VietnamItinerary({ days }: { days: number }) {
  const { pathname } = useLocation();
  const isStudent = pathname.startsWith("/students");

  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          {days} DAYS.<br />
          <span className="text-mm-lime">FIVE STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          HANOI → LAN HA BAY → HA GIANG LOOP → NINH BINH → HOI AN
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
          <ol className="mt-10 space-y-10 md:mt-16 md:space-y-14">
            {STOPS.map((s, i) => (
              <li
                key={s.index}
                className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-10"
              >
                <div
                  className={`relative overflow-hidden border-[3px] border-mm-bone ${
                    i % 2 === 1 ? "md:order-2" : ""
                  }`}
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute left-3 top-3">
                    <Sticker color={i % 2 === 0 ? "pink" : "yellow"} rotate={-6}>
                      STOP {String(s.index).padStart(2, "0")}
                    </Sticker>
                  </div>
                </div>

                <div>
                  <p className="font-sticker text-[10px] tracking-[0.22em] text-mm-lime md:text-[11px]">
                    STOP {s.index} · {s.nights.toUpperCase()}
                  </p>
                  <h3 className="mt-2 font-display text-3xl leading-[1.02] text-mm-bone md:text-5xl">
                    {s.name.toUpperCase()}
                  </h3>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-mm-bone/90 md:text-[15px]">
                    {s.body}
                  </p>
                  <p className="mt-4 inline-block border-[3px] border-mm-bone/40 px-3 py-1 font-sticker text-[10px] tracking-[0.18em] text-mm-lime md:text-[11px]">
                    MEALS: {s.meals.toUpperCase()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
