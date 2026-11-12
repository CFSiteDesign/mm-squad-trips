// Cambodia content, from the 28 Aug brief.
//
// The brief contradicts itself on a few facts. Resolved to the reading the
// itinerary and FAQ agree on, and flagged with Charlie:
//   • "14 Days" in the header vs "Days: 7" in the snapshot vs Day 1–15 in the
//     day-by-day. Using 14.
//   • "2 Locations" in the header vs "4 destinations" in the FAQ. Using 4,
//     which is what the itinerary actually visits.
//   • Trip code read CAM07 on a 14-day trip. Recoded to CAM14 (15 Oct 2026):
//     codes now follow country + days (IND12, IND07, VIET14, VIET07, CAM14,
//     THAI11, LAOS10). These are the codes the pages show; the database keeps
//     its own short codes, which go into booking references.
//
// 11 Nov 2026 brief ("Cambodia All-In Trip, page update brief"): Kampot replaces
// Sihanoukville, one night each comes off Phnom Penh and Siem Reap. Still 14
// days, still Thursdays, route Phnom Penh → Siem Reap → Kampot → Koh Rong →
// Koh Sdach. New day-by-day, overview, highlights, transport line and map.
import s21 from "@/assets/kh-hl-s21.jpg";
import angkor from "@/assets/kh-hl-angkor.jpg";
import floating from "@/assets/kh-hl-floating.jpg";
import nestival from "@/assets/kh-hl-nestival.jpg";
import pepperFarm from "@/assets/kh-hl-pepper-farm.jpg";
import boatParty from "@/assets/kh-hl-boat-party.jpg";
import privateBeach from "@/assets/kh-hl-private-beach.jpg";
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";

export const KH_SNAPSHOT = {
  tripCode: "CAM14",
  days: 14,
  from: "Phnom Penh",
  to: "Koh Sdach",
  countries: "Cambodia",
  blurb:
    "Ready for the ultimate 14-day Cambodian journey? Dive straight into Phnom Penh's history and nightlife, then explore the ancient temples of Angkor Wat in Siem Reap. Head south to riverside Kampot for pepper farms, cooking classes and a proper lie-in, before hitting the paradise island of Koh Rong for boat parties and beach festivals. Wrap up on the hidden oasis of Koh Sdach with island loops, sunset cruises and pure island chill.",
};

export const KH_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (some hangovers, and sunrise raves)" },
];

export const KH_HIGHLIGHTS: Highlight[] = [
  { title: "S21 & Killing Fields", image: s21 },
  { title: "Angkor Wat Temple", image: angkor },
  { title: "Floating Village", image: floating },
  { title: "Nestival Access", image: nestival },
  { title: "Kampot Pepper Farm", image: pepperFarm },
  { title: "Private Beach, Koh Sdach", image: privateBeach },
  { title: "Koh Rong Boat Party", image: boatParty },
];

export const KH_INCLUDED = [
  "14 days, 5 destinations",
  "All scheduled transport, including the bus to Siem Reap, the overnight VIP sleeper to Kampot, the ferry from Kampot to Koh Rong, the boat to Koh Sdach, e-bikes for the island loop, and the transfer back to Phnom Penh",
  "24/7 local crew",
  "Free pre-night: arrive the night before and it's on us",
  "1 breakfast, 3 lunches and 5 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const KH_ITINERARY: Day[] = [
  { label: "Day 1", place: "Phnom Penh",
    body: "Welcome to Cambodia! Arrive in the capital and make your way to Mad Monkey. Settle in before the Welcome Khmer Family Dinner (6:30 PM – 8:00 PM) to toast the trip ahead and meet the crew you'll be travelling with.",
    meals: "Welcome Khmer family dinner (plus free-flow drinks)" },
  { label: "Day 2", place: "Phnom Penh",
    body: "Dive into Cambodian history with a guided cultural tour of S21 Prison and the Killing Fields (8:00 AM – 2:00 PM). It's a heavy morning, but it's the one that makes sense of everything else. Refresh at the hostel, then head out at 4:30 PM for a sunset boat cruise along the river.",
    activities: "S21 & Killing Fields cultural tour, sunset boat cruise" },
  { label: "Day 3", place: "Phnom Penh → Siem Reap",
    body: "Board the 11:00 AM bus north across the Cambodian countryside, arriving in Siem Reap around 5:00 PM. Check into Mad Monkey, then roll your sleeves up for a make-your-own pizza night at 7:00 PM.",
    transport: "Bus transfer from Phnom Penh to Siem Reap", activities: "Make your own pizza night" },
  { label: "Day 4", place: "Siem Reap",
    body: "Morning is yours to explore the town or recover by the pool. At 2:00 PM head out on the floating village tour across Tonlé Sap lake, with dinner and a drink included, getting back around 7:30 PM. Back at the hostel it's the music quiz.",
    activities: "Tonlé Sap floating village tour, hostel music quiz", meals: "Dinner & drink on tour" },
  { label: "Day 5", place: "Siem Reap → Kampot",
    body: "Set an early alarm for the Angkor Wat sunrise tour (4:30 AM – 12:30 PM), with lunch and a drink after. Spend the afternoon at the hostel before boarding the 10:00 PM sleeper bus south to Kampot. (Your Angkor Wat entry pass is bought in person with ID and isn't included in the price.)",
    transport: "Overnight VIP sleeper bus to Kampot", activities: "Angkor Wat sunrise tour", meals: "Tour lunch & drink" },
  { label: "Day 6", place: "Kampot",
    body: "Roll into Kampot around 7:00 AM and check into Mad Monkey. At 10:00 AM head out on the pepper farm day trip, with a factory tour and a taste test of the pepper Kampot is famous for, back by 3:00 PM. Evening is yours by the river.",
    activities: "Kampot pepper farm day trip with factory tour & tasting" },
  { label: "Day 7", place: "Kampot",
    body: "Have a lie-in and make the most of the sauna, steam room, ice baths and gym. At 2:00 PM it's a Khmer cooking class: you'll cook it, eat it and wash it down, with lunch, a drink and ice cream included, wrapping at 5:00 PM.",
    activities: "Hostel sauna, steam room, ice baths & gym, Khmer cooking class", meals: "Cooking class lunch, drink & ice cream" },
  { label: "Day 8", place: "Kampot → Koh Rong",
    body: "Leave Kampot at 8:30 AM and arrive on Koh Rong around 2:00 PM. Check into your beach dorm, then take two hours of kayak hire whenever you fancy it. Rest of the day is beach, swim, repeat.",
    transport: "Ferry transfer from Kampot to Koh Rong", activities: "Two hours kayak hire" },
  { label: "Day 9", place: "Koh Rong (Boat Party)",
    body: "The big one. Pre-party and BBQ at Treehouse Resort from 11:30 AM, boarding at 1:00 PM and casting off at 2:00 PM. Three-storey yacht with an international DJ, a slide, a jump-and-swim stop and a wristband bar. Back to Longset Pier, and the after-party rolls on at Mad Monkey.",
    activities: "Koh Rong boat party" },
  { label: "Day 10", place: "Koh Rong (Nestival)",
    body: "Spend the day at Nestival, Koh Rong's beach festival: three stages of DJs, beach olympics, food and market stalls, a fire show, fire limbo and music from morning until it's not morning any more.",
    activities: "Nestival beach festival ticket" },
  { label: "Day 11", place: "Koh Rong",
    body: "Recovery day. Take the beach slowly, then join the volleyball tournament at 2:30 PM. Finish the night with a beach fireshow at 8:00 PM.",
    activities: "Hostel volleyball tournament, beach fireshow" },
  { label: "Day 12", place: "Koh Rong → Koh Sdach",
    body: "Hop on the 10:45 AM boat for the one-hour crossing to the hidden island of Koh Sdach. Settle into Mad Monkey, make use of the spa, and join the wellness challenge at 2:00 PM. At 4:00 PM grab an e-bike for the Koh Sdach Loop: a lap of the island, a few beers and the sunset.",
    transport: "Boat transfer to Koh Sdach", activities: "Hostel wellness challenge, Koh Sdach e-bike loop" },
  { label: "Day 13", place: "Koh Sdach",
    body: "Out at midday for four hours of snorkelling and fishing around the islands. Back for an evening at the hostel and the pub quiz.",
    activities: "Snorkelling & fishing tour, hostel pub quiz" },
  { label: "Day 14", place: "Koh Sdach",
    body: "A proper chill day on the private beach. Head out on the sunset cruise from 6:30 PM, then back for a final make-your-own pizza night.",
    activities: "Sunset cruise, make your own pizza night" },
  { label: "Day 15", place: "Koh Sdach → Phnom Penh",
    body: "Say goodbye to the squad. Catch the 9:00 AM transfer back to Phnom Penh, arriving around 1:00 PM, and on to whatever's next.",
    transport: "Transfer bus back to Phnom Penh" },
];

export const KH_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "14 days across 5 destinations, all scheduled transport (the bus from Phnom Penh to Siem Reap, the overnight VIP sleeper to Kampot, the ferry from Kampot to Koh Rong, the boat to Koh Sdach, e-bikes for the island loop and the transfer bus back to Phnom Penh), 24/7 local crew, a free pre-trip night, 1 breakfast, 3 lunches and 5 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey.",
  "What are the main highlights of this trip?":
    "The Angkor Wat sunrise tour, the Nestival beach and jungle rave ticket, the Tonle Sap floating village tour, the S21 and Killing Fields cultural tour, the Koh Sdach e-bike loop, sunset boat cruises in Phnom Penh and on the islands, the bottomless brunch with live DJ, the Siem Reap messy pub crawl, Koh Rong beach olympics and fireshows, and kayak and paddleboard rentals.",
  "What meals are included?": "1 breakfast, 3 lunches and 5 dinners, plus lots of free drinks.",
  "What are the modes of transportation?":
    "A bus from Phnom Penh to Siem Reap, an overnight VIP sleeper bus to Kampot, a ferry from Kampot to Koh Rong, a boat to Koh Sdach, e-bikes for the Koh Sdach loop, and a transfer bus back to Phnom Penh.",
  "Where will we stay during the trip?":
    "Every stay is in a Mad Monkey property: Phnom Penh, Siem Reap, Kampot, Koh Rong and Koh Sdach.",
  "What are the visa and entry requirements?":
    "All countries require a valid passport with a minimum 6 months validity. Most nationalities require a tourist visa (Type T) for Cambodia. You can apply online before travel via the official Kingdom of Cambodia e-Visa portal, or get a visa on arrival at international airports and major border crossings. The tourist visa is valid for 30 days on entry and can be extended once for another 30 days in country. Visa information is correct at the time of writing and you are responsible for checking current rules for your country of birth.",
  "What should I know about currency and cards?":
    "The local currency is the Riel, and USD is widely accepted. The best way to carry money is a debit card, withdrawing local cash from ATMs. Travel with both a Visa and a Mastercard in case of a problem with one. USD, EUR, GBP, CAD and AUD cash is useful for when ATMs aren't accessible.",
};
