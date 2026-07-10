import { Sticker } from "@/components/brand/Sticker";
import hanoiImg from "@/assets/vn-hanoi.jpg";
import hagiangImg from "@/assets/vn-hagiang.jpg";

type Day = { day: number; title: string; image: string; body: string; meals: string };

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
    title: "Explore Hanoi",
    image: hanoiImg,
    body:
      "Get under the skin of the city with our local crew leading the way. Hoan Kiem Lake, St. Joseph's Cathedral, a proper egg coffee, and a finish at Train Street as the carriages rattle past inches from your cup. The rest of the day is open. Jump on the music quiz and pub crawl, or take the evening to roam Hanoi at your own pace.",
    meals: "Breakfast",
  },
  {
    day: 3,
    title: "Welcome to Ha Giang",
    image: hagiangImg,
    body:
      "Set off towards Ha Giang city on our VIP Cabin Bus. Spend the afternoon by the pool with a welcome drink and big mountain views, getting to know the crew you'll share the next four days with. Come evening, your Tour Leader and Easy Riders join for dinner, with stories from the road and a taste of what's coming. Dinner at the retreat is an optional add-on (200,000 VND).",
    meals: "Breakfast",
  },
  {
    day: 4,
    title: "The Ha Giang Loop begins",
    image: hagiangImg,
    body:
      "Wake up in Ha Giang, grab your crew and point the bikes at the mountains. Today is all first views, winding passes and waterfalls you didn't see coming. Dramatic roads, tiny villages, and the sound of engines rolling down the valleys. You'll stop every twenty minutes because the views are ridiculous. The night lands family-style in Du Gia: shared dinner, karaoke, happy water and underground bars, with people who already feel like old mates.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 5,
    title: "Ma Pi Leng",
    image: hagiangImg,
    body:
      "This is the day people talk about for years. Bigger mountains, wilder roads, and the legendary Ma Pi Leng Pass, cliffside tarmac with the Nho Que River carving the canyon far below. Every corner looks unreal. Every stop somehow tops the last. By the time you're cracking sunset beers in Dong Van, normal life feels a world away.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 6,
    title: "To the top of Vietnam",
    image: hagiangImg,
    body:
      "Culture, history and some of the most iconic scenery on the Loop. Ride to Lung Cu Flag Tower, the very top of Vietnam, then look across the border into China, and wander ancient villages where kids wave from the roadside. Then a football match with your Easy Riders gets gloriously chaotic, before one big farewell dinner brings the crew together.",
    meals: "Breakfast, Lunch, Dinner",
  },
  {
    day: 7,
    title: "Last ride home",
    image: hagiangImg,
    body:
      "One last morning in the mountains before the ride home through hidden roads, jungle passes and a secret waterfall or two. By now the group feels like family and nobody's ready for it to end. Music in the helmets, tired eyes, camera rolls full. One last cheers before rolling back into Ha Giang already planning the next one. Back in Hanoi for around 11pm.",
    meals: "Breakfast, Lunch",
  },
  {
    day: 8,
    title: "Check out or onward travel",
    image: hanoiImg,
    body:
      "One final breakfast with the crew. We're not crying… you are! But it's never goodbye for long! With epic hostels all over Southeast Asia, we're ready to host you for the next part of your adventure.",
    meals: "Breakfast",
  },
];

export function Vietnam7Itinerary() {
  return (
    <section className="relative bg-mm-black px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="lime" rotate={3}>THE ITINERARY</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
          7 DAYS.<br />
          <span className="text-mm-lime">TWO STOPS.</span>
        </h2>
        <p className="mt-4 max-w-xl font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70 md:text-xs">
          HANOI → HA GIANG LOOP
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
