// Cambodia 7-day (Koh Rong + Koh Sdach), from the 17 Nov 2026 brief
// ("Landing page brief: ALL IN 7-Day Cambodia (Koh Rong + Koh Sdach)").
// STAGING ONLY until the Koh Rong boat party is ready (Charlie, 17 Nov 2026).
//
// Only what the brief says. It has no highlights section, so the page hides
// it and shows the brief's photo per day in the day-by-day instead. Each
// day's brief title sits in brackets after the place, like the 14-day trip. Days the
// brief marks "Needed" carry `image: null` and render a placeholder tile
// (Charlie: leave those as placeholders for now); Day 8 is "Not needed", so it
// has no photo slot at all.
//
// The brief calls it "7-Day" but heads the page "CAMBODIA · 8 DAYS" with
// "8 days, 7 nights" under it, so the page says 8 days. Flagged with Charlie:
// the other 7-day trips (Indonesia, Vietnam) say 7.
import kohRongDrone from "@/assets/kh7-koh-rong-drone.jpg";
import boatParty from "@/assets/kh7-boat-party.jpg";
import nestival from "@/assets/kh7-nestival.jpg";
import kohSdach from "@/assets/kh7-koh-sdach.jpg";
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";

export const K7_HERO = kohRongDrone;

export const K7_SNAPSHOT = {
  tripCode: "CAM07",
  days: 8,
  from: "Koh Rong",
  to: "Koh Sdach",
  countries: "Cambodia",
  blurb:
    "Eight days, two islands, one price. Land on Koh Rong for a weekend of boat parties, beach parties and sunsets you'll struggle to describe later. Then a full rest day, because you'll need it. From there it's a 45-minute speedboat to Koh Sdach, the Maldives of Cambodia, for snorkelling, fishing, cocktails and very little else.",
};

// Not in the brief: the standard ALL IN rows every trip page carries.
export const K7_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate" },
];

export const K7_HIGHLIGHTS: Highlight[] = [];

export const K7_INCLUDED = [
  "8 days, 7 nights on 2 islands: Koh Rong and Koh Sdach",
  "6 breakfasts",
  "The 45-minute speedboat from Koh Rong to Koh Sdach",
  "Koh Rong Boat Party and Nestival",
  "Welcome cocktail and 2 hours of free flow on night one",
  "Free beers and cocktails along the way",
  "Every activity in the itinerary",
];

export const K7_NOT_INCLUDED = [
  "Flights and getting to Koh Rong",
  "Massage, paddleboard and jet skis (bookable at the property)",
  "Onward transfers and rooms after Day 8 (at an ALL IN rate)",
  "Travel insurance",
  "Personal expenses",
];

export const K7_ITINERARY: Day[] = [
  { label: "Day 1", place: "Koh Rong", image: kohRongDrone,
    body: "Welcome to Koh Rong! Arrive and check in, then it's the Meet Up: a welcome cocktail and two hours of free flow. It's a group bonding night, because most people arrive not knowing anyone.",
    activities: "Meet Up, welcome cocktail, 2 hours free flow" },
  { label: "Day 2", place: "Koh Rong (Boat Party)", image: boatParty,
    body: "Beach breakfast, then the pre-party at Treehouse. Then the boat: 350 people across three dancefloors, a deck slide, sea jumps and sunset DJs, and the after party when you're back.",
    activities: "Treehouse pre-party, Koh Rong Boat Party, after party", meals: "Beach breakfast" },
  { label: "Day 3", place: "Koh Rong (Nestival)", image: nestival,
    body: "Cambodia's biggest weekly beach party. Doors open at midday, with free-flow beer from 1 to 3pm, then beach games, fire shows and DJs on the beachfront until 6am.",
    activities: "Nestival, free-flow beer 1 to 3pm, beach games, fire shows" },
  { label: "Day 4", place: "Koh Rong (Rest day)", image: null,
    body: "Beach and recovery, because you'll need it. Massage, paddleboard and jet skis are bookable at the property." },
  { label: "Day 5", place: "Koh Rong → Koh Sdach", image: null,
    body: "Welcome to Koh Sdach! The 10:30am speedboat takes 45 minutes, then it's the wellness challenge, sunset longtail fishing, the banana boat and free beers, then the Meet Up.",
    transport: "45-minute speedboat from Koh Rong to Koh Sdach, 10:30am",
    activities: "Wellness challenge, sunset longtail fishing, banana boat, free beers, Meet Up" },
  { label: "Day 6", place: "Koh Sdach (Explore the island)", image: kohSdach,
    body: "A guided e-bike loop through the fishing village, then snorkel and kayak hire. Meet Up later, with a free cocktail.",
    activities: "Guided e-bike loop, snorkel and kayak hire, Meet Up and a free cocktail" },
  { label: "Day 7", place: "Koh Sdach (Villa vibes)", image: kohSdach,
    body: "An optional beach clean-up, then the infinity pool and the wellness facilities. Finish with a make-your-own-pizza night in the wood-fired oven.",
    activities: "Optional beach clean-up, infinity pool, wellness facilities, make-your-own-pizza night" },
  { label: "Day 8", place: "Koh Sdach → Onwards",
    body: "Last breakfast and check out at 12pm. Heading on? Onward transfers and rooms in Kampot, Phnom Penh or Siem Reap are available at an ALL IN rate.",
    meals: "Breakfast" },
];
