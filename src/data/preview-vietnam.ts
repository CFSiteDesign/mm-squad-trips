// Vietnam 14-day content, from the 28 Aug brief. Same shape as the Indonesia
// file so the shared preview trip template can render either.
import oldQuarter from "@/assets/vn-hl-old-quarter.jpg";
import trainStreet from "@/assets/vn-hl-train-street.jpg";
import maPiLeng from "@/assets/vn-hl-ma-pi-leng.jpg";
import ninhBinh from "@/assets/vn-hl-ninh-binh.jpg";
import bambooBoats from "@/assets/vn-hl-bamboo-boats.jpg";
import riverCruise from "@/assets/vn-hl-river-cruise.jpg";
import type { Day } from "@/data/preview-indonesia";

export const VN_SNAPSHOT = {
  tripCode: "VIET14",
  days: 14,
  from: "Hanoi",
  to: "Hoi An",
  countries: "Vietnam",
  blurb:
    "From the iconic buzz of Beer Street in Hanoi to high-altitude views across the Ha Giang Loop, this 14-day run through Vietnam packs in every bucket-list moment. Overnight on a cruise through Ha Long Bay's limestone peaks, explore the serene water caves of Ninh Binh, and cap it all off soaking up beach culture and nightlife in historic Hoi An. Built for young travelers who want a solid crew, zero planning stress, and memories that hit different.",
};

export const VN_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (some hangovers, some hikes)" },
];

export const VN_HIGHLIGHTS: { title: string; image: string | null }[] = [
  { title: "Hanoi's Old Quarter", image: oldQuarter },
  { title: "Train Street", image: trainStreet },
  { title: "Ma Pi Leng Pass, Ha Giang", image: maPiLeng },
  { title: "Ninh Binh", image: ninhBinh },
  { title: "Bamboo Boats + Cooking Class", image: bambooBoats },
  { title: "Sunset River Cruise", image: riverCruise },
];

export const VN_INCLUDED = [
  "14 days, 5 destinations",
  "All scheduled transport, including Hanoi–Lan Ha Bay transfers, Ha Giang transport, the VIP cabin sleeper bus to Hoi An and all boat transfers",
  "24/7 local crew",
  "Free pre-night — arrive the night before and it's on us",
  "11 breakfasts, 7 lunches and 5 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const VN_ITINERARY: Day[] = [
  { label: "Day 1", place: "Hanoi",
    body: "Welcome to Vietnam! Touch down in historic Hanoi, check into the hostel, and enjoy some free time to settle in. Tonight, kick things off with a welcome drink at the hostel to meet your crew, then head out into the vibrant streets for ice-cold bia hoi and authentic local street food. End the night with optional free karaoke and a pub crawl.",
    activities: "Welcome drinks, Hanoi street food & bia hoi night", meals: "Welcome dinner & drinks" },
  { label: "Day 2", place: "Hanoi",
    body: "Get to know the chaotic charm of Hanoi on a guided walking tour led by the local team. Stroll around Hoan Kiem Lake, marvel at St. Joseph's Cathedral, fuel up with legendary Vietnamese coffee, and cap off the tour watching trains squeeze past on iconic Train Street. Tonight, jump into a music quiz before taking on the local nightlife.",
    activities: "Guided Hanoi walking tour (Hoan Kiem Lake, St. Joseph's Cathedral, Vietnamese coffee tasting, Train Street)", meals: "Breakfast" },
  { label: "Day 3", place: "Hanoi → Lan Ha Bay",
    body: "Depart Hanoi early and transfer to the stunning waters of Lan Ha Bay. Board your cruise boat for an action-packed afternoon of swimming, tubing, and beach volleyball. As the sun sets over the limestone karsts, turn up the music for a boat party before spending the night sleeping under the stars on board.",
    transport: "Transfer to Lan Ha Bay", activities: "Lan Ha Bay overnight cruise, swimming, tubing, beach volleyball, sunset boat party", meals: "Breakfast, lunch, dinner" },
  { label: "Day 4", place: "Lan Ha Bay → Hanoi",
    body: "Wake up on the water, grab some breakfast, and hit the bay for a morning kayaking session among hidden lagoons. After a local lunch, cruise back to shore and transfer back to Hanoi. Put on your freshest outfit for the legendary White Party, featuring two hours of free-flowing beer and live DJs, before keeping the night going on Beer Street.",
    transport: "Transfer back to Hanoi", activities: "Morning kayaking, Mad Monkey White Party (2-hour free-flow beer & live DJs)", meals: "Breakfast, lunch" },
  { label: "Day 5", place: "Hanoi → Ha Giang",
    body: "Enjoy a relaxed day in Hanoi before making the journey north toward Ha Giang. Arrive, check in, and get prepped for the mountain ride of a lifetime. Get a solid night's sleep — the epic Ha Giang Loop adventure officially kicks off first thing tomorrow morning!",
    meals: "Breakfast" },
  { label: "Day 6", place: "Ha Giang Loop (Day 1)",
    body: "Wake up in Ha Giang, rally your crew, and ride straight up into the mountains. Day 1 delivers your first taste of loop energy: dramatic panoramic views, winding mountain passes, hidden waterfalls, and crisp high-altitude air. Settle into a local homestay for the night.",
    activities: "Ha Giang Loop riding (mountain passes & hidden waterfalls), homestay experience", meals: "Breakfast, lunch, dinner" },
  { label: "Day 7", place: "Ha Giang Loop (Day 2)",
    body: "This is the day everyone talks about long after the trip ends. Carve through bigger mountains, tackle wilder twisty roads, and conquer the legendary Ma Pi Leng Pass. Stop to soak in the jaw-dropping views of the Nho Que River far below before wrapping up another electric night in the mountains.",
    activities: "Ma Pi Leng Pass ride, Nho Que River viewpoints, mountain homestay", meals: "Breakfast, lunch, dinner" },
  { label: "Day 8", place: "Ha Giang Loop (Day 3)",
    body: "Blend culture, history, and unreal scenery today as you ride up toward Vietnam's northernmost frontier. Explore ancient ethnic villages, ride deep into remote mountain territory, and spend another unforgettable evening eating, drinking, and laughing with your homestay hosts.",
    activities: "Northern frontier & ancient village exploration, homestay dinner & drinks", meals: "Breakfast, lunch, dinner" },
  { label: "Day 9", place: "Ha Giang Loop → Hanoi",
    body: "Take on the final stretch of the loop! Soak in one last morning of mountain air as you navigate hidden roads, jungle-covered passes, and secret waterfall spots back toward Ha Giang. Say goodbye to the bikes and transfer back to Hanoi with a crew that now feels like family.",
    transport: "Transfer back to Hanoi", activities: "Jungle passes & secret waterfalls ride", meals: "Breakfast, lunch" },
  { label: "Day 10", place: "Hanoi → Ninh Binh → sleeper bus",
    body: "Trade city streets for breathtaking countryside on a full-day tour to Ninh Binh. Known as “Ha Long Bay on Land”, you'll glide past towering karst peaks and through emerald caves on a traditional sampan boat in Tam Coc. After dinner, board a VIP cabin sleeper bus for an overnight journey south to Hoi An.",
    transport: "VIP cabin sleeper bus to Hoi An", activities: "Full-day Ninh Binh tour, Tam Coc sampan boat ride", meals: "Breakfast, lunch" },
  { label: "Day 11", place: "Hoi An",
    body: "Roll into coastal Hoi An early, check into the hostel, and spend the morning relaxing pool-side. Around 4:00 PM, the party starts! Dive into the Mad Monkey Sunset Pool Party with free beer, happy hour cocktails, and an all-you-can-eat backyard BBQ spread.",
    activities: "Mad Monkey Sunset Pool Party", meals: "All-you-can-eat backyard BBQ dinner (plus free beer)" },
  { label: "Day 12", place: "Hoi An",
    body: "Hop on two wheels at 11:00 AM for a cycling tour around Hoi An. Get creative at a traditional lantern workshop, drop by the Rehahn Gallery & Museum, walk across the iconic Japanese Covered Bridge, explore an ancient house, and visit a world-famous local tailor. Cap off the ride back at the hostel with an ice-cold beer, then hit free karaoke and a pub crawl tonight.",
    activities: "Guided Hoi An cycling tour (lantern workshop, Rehahn Gallery, Japanese Bridge, ancient house, tailor stop)", meals: "Breakfast, lunch" },
  { label: "Day 13", place: "Hoi An",
    body: "Out early for a classic Hoi An experience! Explore a bustling local market before paddling through coconut mangroves in a traditional bamboo basket boat. Next, roll up your sleeves for a hands-on cooking class with a local chef to learn delicacies like bánh xèo and spring rolls. End the day with a relaxing sunset river cruise before your final big night out.",
    activities: "Local market tour, coconut mangrove bamboo basket boat ride, hands-on Vietnamese cooking class, sunset river cruise", meals: "Breakfast, cooking class lunch" },
  { label: "Day 14", place: "Hoi An",
    body: "Enjoy one last breakfast with your crew and swap contacts before checking out. Head to Da Nang Airport (DAD) for your onward flight home or to your next destination.",
    meals: "Breakfast" },
];

/** Vietnam-specific answers. Anything not overridden falls back to the shared set. */
export const VN_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "14 days across 5 destinations, all scheduled transport (Hanoi–Lan Ha Bay transfers, Ha Giang transport, the VIP cabin sleeper bus to Hoi An and all boat transfers), 24/7 local crew, a free pre-trip night, 11 breakfasts, 7 lunches and 5 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey.",
  "What are the main highlights of this trip?":
    "Hanoi street food and the Train Street guided walking tour, the 2D1N Lan Ha Bay overnight cruise and sunset boat party, the 4D3N Ha Giang Loop motorbike adventure (Ma Pi Leng Pass and homestays), the Tam Coc sampan boat ride in Ninh Binh, the Mad Monkey White Party and Hoi An sunset pool party, a guided cycling tour of Hoi An Old Town with a local tailor visit, and a bamboo basket boat ride through the coconut mangroves with a hands-on cooking class.",
  "What meals are included?": "11 breakfasts, 7 lunches and 5 dinners, plus lots of free drinks.",
  "What are the modes of transportation?":
    "Land: private shuttles and buses, a VIP cabin sleeper bus from Ninh Binh to Hoi An, motorbikes on the Ha Giang Loop and bicycles in Hoi An. Water: the Lan Ha Bay cruise ship and kayaks, traditional sampan boats in Ninh Binh, bamboo basket boats in the Hoi An coconut groves, and river cruise boats.",
  "Where will we stay during the trip?":
    "Standard dorm beds at Mad Monkey Hanoi and Mad Monkey Hoi An, one night aboard the Lan Ha Bay cruise in a cabin room, three nights in traditional village homestays deep in the northern mountains, and one night on the VIP cabin sleeper bus travelling overnight to Hoi An.",
  "What are the visa and entry requirements?":
    "Passports must have at least 6 months validity remaining from the entry date. Most international travellers require a visa for Vietnam. Vietnam offers an official e-Visa allowing up to 90 days, applied for online via the Vietnam Immigration Department portal before arrival. Citizens of some countries, including the UK, France, Germany and Spain, currently receive up to 45 days visa-free. Visa information is correct at the time of writing and you are responsible for checking current rules for your country of birth.",
  "What should I know about currency and cards?":
    "The local currency is the Vietnamese Dong. The best way to carry money is a debit card, withdrawing local cash from ATMs. Travel with both a Visa and a Mastercard in case of a problem with one. USD, EUR, GBP, CAD and AUD cash is useful for when ATMs aren't accessible.",
};
