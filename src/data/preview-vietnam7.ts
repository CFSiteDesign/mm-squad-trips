// Vietnam 7-day content, from the 28 Aug brief.
import oldQuarter from "@/assets/vn-hl-old-quarter.jpg";
import trainStreet from "@/assets/vn-hl-train-street.jpg";
import hoanKiem from "@/assets/vn-hl-hoan-kiem.jpg";
import khauLan from "@/assets/vn-hl-khau-lan.jpg";
import maPiLeng from "@/assets/vn-hl-ma-pi-leng.jpg";
import ancientVillage from "@/assets/vn-hl-ancient-village.jpg";
import type { Day } from "@/data/preview-indonesia";

export const VN7_SNAPSHOT = {
  tripCode: "VIET07",
  days: 7,
  from: "Hanoi",
  to: "Ha Giang",
  countries: "Vietnam",
  blurb:
    "Ready for mountain air and northern Vietnam's rawest landscapes? Kick things off diving headfirst into Hanoi's electric street food scene before taking on the legendary Ha Giang Loop, a 4-day mountain ride through towering peaks, epic passes, and authentic village homestays.",
};

export const VN7_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (some hangovers, some hikes)" },
];

export const VN7_HIGHLIGHTS: { title: string; image: string | null }[] = [
  { title: "Hanoi's Old Quarter", image: oldQuarter },
  { title: "Train Street", image: trainStreet },
  { title: "Hoan Kiem Lake", image: hoanKiem },
  { title: "Khau Lan Waterfall", image: khauLan },
  { title: "Ma Pi Leng Pass, Ha Giang", image: maPiLeng },
  { title: "Ancient Village, Ha Giang", image: ancientVillage },
];

export const VN7_INCLUDED = [
  "7 days, 2 destinations",
  "All scheduled transport to and from Ha Giang",
  "24/7 local crew",
  "Free pre-night — arrive the night before and it's on us",
  "7 breakfasts, 3 lunches and 4 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const VN7_ITINERARY: Day[] = [
  { label: "Day 1", place: "Hanoi",
    body: "Welcome to Vietnam! Touch down in historic Hanoi, check into the hostel, and enjoy some free time to get your bearings. Tonight, kick things off with a welcome drink at the hostel to meet your crew, then head out into the bustling streets for ice-cold bia hoi and authentic local street food. End the night with optional free karaoke and a pub crawl.",
    activities: "Welcome drinks, Hanoi street food & bia hoi night", meals: "Welcome dinner & drinks" },
  { label: "Day 2", place: "Hanoi",
    body: "Get to know the dynamic energy of Hanoi on a guided walking tour led by the local team. Stroll around Hoan Kiem Lake, marvel at St. Joseph's Cathedral, fuel up with iconic Vietnamese coffee, and finish up watching trains squeeze down famous Train Street. Tonight, test your trivia skills with a music quiz before hitting the nightlife.",
    activities: "Guided Hanoi walking tour (Hoan Kiem Lake, St. Joseph's Cathedral, Vietnamese coffee tasting, Train Street)", meals: "Breakfast" },
  { label: "Day 3", place: "Hanoi → Ha Giang",
    body: "Enjoy an easy-going day in Hanoi before making the journey north toward Ha Giang. Arrive, check in, and get your gear ready for the ride ahead. Rest up tonight — the official 4-day Ha Giang Loop adventure starts first thing tomorrow morning!",
    meals: "Breakfast" },
  { label: "Day 4", place: "Ha Giang Loop (Day 1)",
    body: "Wake up in Ha Giang, rally your crew, and ride straight up into the mountains. Day 1 is all about high-altitude energy: sweeping views, twisting passes, hidden waterfalls, and crisp mountain air. Settle into your first local homestay tonight.",
    activities: "Ha Giang Loop riding (mountain passes & hidden waterfalls), homestay experience", meals: "Breakfast, lunch, dinner" },
  { label: "Day 5", place: "Ha Giang Loop (Day 2)",
    body: "This is the ride you'll be talking about long after you head home. Conquer bigger peaks, tackle wild winding roads, and ride the legendary Ma Pi Leng Pass. Stop for panoramic viewpoints over the valley before wrapping up another epic evening in the mountains.",
    activities: "Ma Pi Leng Pass ride, panoramic mountain viewpoints, local homestay", meals: "Breakfast, lunch, dinner" },
  { label: "Day 6", place: "Ha Giang Loop (Day 3)",
    body: "Blend culture, history, and unreal scenery as you head toward Vietnam's northern frontier. Explore ancient villages, ride deep into remote mountain landscapes, and spend another unforgettable evening sharing meals and drinks with your homestay hosts.",
    activities: "Northern frontier & ancient village exploration, homestay dinner & drinks", meals: "Breakfast, lunch, dinner" },
  { label: "Day 7", place: "Ha Giang Loop → Hanoi",
    body: "Take on the final stretch of the loop! Ride through hidden roads, jungle-covered passes, and secret waterfall spots back toward Ha Giang. Say goodbye to the bikes and catch a shuttle transfer back to Hanoi with a crew that now feels like family.",
    transport: "Transfer back to Hanoi", activities: "Jungle passes & secret waterfalls ride", meals: "Breakfast, lunch" },
  { label: "Day 8", place: "Departure day",
    body: "Wake up in Hanoi and enjoy one last breakfast together with the group. Say your farewells before heading home, or talk to the team about extending your trip south to Ninh Binh and Hoi An!",
    meals: "Breakfast" },
];

export const VN7_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "7 days across 2 destinations, all scheduled transport to and from Ha Giang, 24/7 local crew, a free pre-trip night, 7 breakfasts, 3 lunches and 4 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey.",
  "What are the main highlights of this trip?":
    "Hanoi street food and bia hoi night, the guided Hanoi walking tour with Vietnamese coffee tasting and Train Street, Mad Monkey nightly events like karaoke, the pub crawl and music quiz, the 4D3N Ha Giang Loop motorbike tour, and local homestay experiences.",
  "What meals are included?": "7 breakfasts, 3 lunches and 4 dinners, plus lots of free drinks.",
  "What are the modes of transportation?": "Private shuttles and buses, plus motorbikes on the Ha Giang Loop.",
  "Where will we stay during the trip?":
    "Dorm beds at Mad Monkey Hanoi, plus three nights in traditional local homestays on the Ha Giang Loop.",
  "What are the visa and entry requirements?":
    "Passports must have at least 6 months validity remaining from the entry date. Most international travellers require a visa for Vietnam. Vietnam offers an official e-Visa allowing up to 90 days, applied for online via the Vietnam Immigration Department portal before arrival. Citizens of some countries, including the UK, France, Germany and Spain, currently receive up to 45 days visa-free. Visa information is correct at the time of writing and you are responsible for checking current rules for your country of birth.",
  "What should I know about currency and cards?":
    "The local currency is the Vietnamese Dong. The best way to carry money is a debit card, withdrawing local cash from ATMs. Travel with both a Visa and a Mastercard in case of a problem with one. USD, EUR, GBP, CAD and AUD cash is useful for when ATMs aren't accessible.",
};
