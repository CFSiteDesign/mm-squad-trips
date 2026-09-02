// Indonesia 7-day content, from the 28 Aug brief.
import snorkeling from "@/assets/i7-hl-snorkeling.jpg";
import mexican from "@/assets/i7-hl-mexican.jpg";
import boatParty from "@/assets/i7-hl-boat-party.jpg";
import surfCamp from "@/assets/i7-hl-surf-camp.jpg";
import videoAnalysis from "@/assets/i7-hl-video-analysis.jpg";
import bikeTour from "@/assets/i7-hl-bike-tour.jpg";
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";

export const I7_SNAPSHOT = {
  tripCode: "INDO07",
  days: 7,
  from: "Gili T",
  to: "Kuta Lombok",
  countries: "Indonesia",
  blurb:
    "Ready for the ultimate 7-day Indonesian sun-and-surf escape? Kick off your week on the vehicle-free island of Gili Trawangan for island bike tours, legendary boat parties, and crystal-clear snorkeling trips before heading over to Lombok to catch your first waves at surf camp.",
};

export const I7_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (some hangovers, and active water days)" },
];

export const I7_HIGHLIGHTS: Highlight[] = [
  { title: "Monkey See, Monkey Do Snorkeling Trip", image: snorkeling },
  { title: "Mexican Family Dinner", image: mexican },
  { title: "Mad Monkey Boat Party", image: boatParty },
  { title: "Kuta Lombok Surf Camp", image: surfCamp },
  // Brief asks for this one right-justified so the staff and laptop stay in frame.
  { title: "Surf Video Analysis", image: videoAnalysis, position: "object-right" },
  { title: "Bucket List Bike Tour", image: bikeTour },
];

export const I7_INCLUDED = [
  "7 days, 2 destinations",
  "All scheduled transport — boat and private transfer from Gili T to Kuta Lombok",
  "24/7 local crew",
  "Free pre-night — arrive the night before and it's on us",
  "4 breakfasts and 5 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const I7_ITINERARY: Day[] = [
  { label: "Day 1", place: "Gili Trawangan",
    body: "Welcome to Gili T! Arrive on the island, shake off the travel day with an ice-cold beer, and dive straight into the pool to cool off. Check into Mad Monkey Gili T, explore the beach, or hang out at the hostel before joining the crew for a traditional Mexican family dinner and drinks.",
    activities: "Welcome drink & pool chill", meals: "Mexican family dinner (plus 2 free drinks)" },
  { label: "Day 2", place: "Gili Trawangan",
    body: "Hop on two wheels for the Gili T Bucket List Bike Tour to explore the island's best hidden spots. Head back to Mad Monkey in the afternoon as the energy turns up for an epic Pool Party featuring a live DJ set.",
    activities: "Gili T Bucket List Bike Tour, Mad Monkey Pool Party with live DJ" },
  { label: "Day 3", place: "Gili Trawangan",
    body: "Set sail for the iconic Mad Monkey Boat Party (2:00 PM – 6:00 PM). Dance, swim, and soak up the tropical vibes out on the water. Keep the night going back at the hostel with an unlimited BBQ feast and drinks.",
    activities: "Mad Monkey Boat Party", meals: "Unlimited hostel BBQ & drinks" },
  { label: "Day 4", place: "Gili Trawangan → Kuta Lombok",
    body: "Dive into the turquoise ocean on the “Monkey See, Monkey Do” Snorkeling Trip (10:30 AM – 4:00 PM) to spot local marine life. Afterward, take a short boat transfer to mainland Lombok followed by a shuttle to Mad Monkey Kuta Lombok.",
    transport: "Boat & shuttle transfer to Kuta Lombok",
    activities: "“Monkey See, Monkey Do” Snorkeling Trip", meals: "Lunch" },
  { label: "Day 5", place: "Kuta Lombok (Surf Camp Day 1)",
    body: "Welcome to Surf Camp! Meet your instructors for a welcome session, get fitted for your gear, receive your welcome pack, and practice your pop-ups on land. Cover surf theory, grab lunch with the crew, and regroup at the hostel tonight for a family dinner and karaoke.",
    activities: "Surf camp intro session (pop-up practice & theory breakdown), nightly hostel karaoke",
    meals: "Breakfast, lunch, family dinner" },
  { label: "Day 6", place: "Kuta Lombok (Surf Camp Day 2)",
    body: "Option to start your morning with a social run club before fueling up with breakfast. Then hit the ocean for a morning surf session at local beaches selected for the day's best conditions. Head back to the hostel for lunch and a photo/video analysis session with your instructors to break down your technique.",
    activities: "Morning surf session, photo & video analysis, optional morning run club",
    meals: "Breakfast, lunch" },
  { label: "Day 7", place: "Kuta Lombok (Surf Camp Day 3)",
    body: "Fuel up with breakfast before heading out for your final morning surf session on the water. Return to the hostel for lunch, then spend a laid-back afternoon hanging out by the pool with drinks during the Mad Monkey Pool Party.",
    activities: "Morning surf session, Mad Monkey afternoon pool party", meals: "Breakfast, lunch" },
  { label: "Day 8", place: "Departure day",
    body: "Say farewell to your crew! Catch a shuttle transfer to Lombok Airport (LOP) for your onward flight.",
    transport: "Shuttle transfer to Lombok Airport (LOP)" },
];

export const I7_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "7 days across 2 destinations, all scheduled transport including the boat and private transfer from Gili T to Kuta Lombok, 24/7 local crew, a free pre-trip night, 4 breakfasts and 5 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey.",
  "What are the main highlights of this trip?":
    "The Gili T Bucket List Bike Tour, the Mad Monkey Pool Party with live DJ, the Mad Monkey Boat Party, the unlimited hostel BBQ, the “Monkey See, Monkey Do” snorkeling trip, the 3-day Kuta Lombok surf camp (pop-up practice, theory breakdown, daily ocean sessions, photo and video analysis), the optional morning run club, and Mad Monkey karaoke night and afternoon pool party.",
  "What meals are included?": "4 breakfasts and 5 dinners, plus lots of free drinks.",
  "What are the modes of transportation?":
    "A private transfer to Kuta Lombok by land, and a short boat ride across from Gili T.",
  "Where will we stay during the trip?":
    "Every stay is in a Mad Monkey property: Mad Monkey Gili T and Mad Monkey Kuta Lombok.",
};
