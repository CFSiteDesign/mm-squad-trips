// Cambodia content, from the 28 Aug brief.
//
// The brief contradicts itself on a few facts. Resolved to the reading the
// itinerary and FAQ agree on, and flagged with Charlie:
//   • "14 Days" in the header vs "Days: 7" in the snapshot vs Day 1–15 in the
//     day-by-day. Using 14.
//   • "2 Locations" in the header vs "4 destinations" in the FAQ. Using 4,
//     which is what the itinerary actually visits.
//   • Trip code reads CAM07 on a 14-day trip. Left exactly as written.
import s21 from "@/assets/kh-hl-s21.jpg";
import angkor from "@/assets/kh-hl-angkor.jpg";
import floating from "@/assets/kh-hl-floating.jpg";
import nestival from "@/assets/kh-hl-nestival.jpg";
import fireshow from "@/assets/kh-hl-fireshow.jpg";
import privateBeach from "@/assets/kh-hl-private-beach.jpg";
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";

export const KH_SNAPSHOT = {
  tripCode: "CAM07",
  days: 14,
  from: "Phnom Penh",
  to: "Koh Sdach",
  countries: "Cambodia",
  blurb:
    "Ready for the ultimate 14-day Cambodian journey? Dive straight into Phnom Penh's rich history and nightlife before exploring the ancient temples of Angkor Wat in Siem Reap. Next, head south to the paradise island of Koh Rong for epic beach parties and sunrise raves, before wrapping up on the hidden oasis of Koh Sdach with island loops, sunset cruises, and pure island chill.",
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
  { title: "Beach Fireshow", image: fireshow },
  { title: "Private Beach, Koh Sdach", image: privateBeach },
];

export const KH_INCLUDED = [
  "14 days, 4 destinations",
  "All scheduled transport, including the bus to Siem Reap, the overnight VIP sleeper to Sihanoukville, ferries to Koh Rong and Koh Sdach, e-bikes for the island loop, and the transfer back to Phnom Penh",
  "24/7 local crew",
  "Free pre-night — arrive the night before and it's on us",
  "1 breakfast, 3 lunches and 5 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const KH_ITINERARY: Day[] = [
  { label: "Day 1", place: "Phnom Penh",
    body: "Welcome to Cambodia! Arrive in the capital city of Phnom Penh and make your way to Mad Monkey. Settle in before meeting up with your crew for a Welcome Khmer Family Dinner (6:30 PM – 8:00 PM) to toast to the trip ahead and get to know the team.",
    meals: "Welcome Khmer family dinner (plus free-flow drinks)" },
  { label: "Day 2", place: "Phnom Penh",
    body: "Dive deep into Cambodian history with a morning guided cultural tour of the S21 Prison and the Killing Fields (8:00 AM – 2:00 PM). Afterward, refresh at the hostel before heading out at 4:30 PM for a relaxing sunset boat cruise along the river.",
    activities: "S21 & Killing Fields cultural tour, sunset boat cruise" },
  { label: "Day 3", place: "Phnom Penh",
    body: "Spend the day exploring Phnom Penh at your own pace. Check out local markets, wander through the historic streets, or kick back by the pool. In the evening, regroup with the squad for a hostel BBQ and pool party (6:00 PM – 8:00 PM).",
    activities: "Hostel BBQ & pool party" },
  { label: "Day 4", place: "Phnom Penh → Siem Reap",
    body: "Board a morning bus at 10:00 AM for a scenic drive north across the Cambodian countryside to Siem Reap, arriving around 6:00 PM. Check into Mad Monkey Siem Reap and roll up your sleeves for a make-your-own pizza night (7:30 PM – 8:30 PM).",
    transport: "Bus transfer from Phnom Penh to Siem Reap", activities: "Make your own pizza night" },
  { label: "Day 5", place: "Siem Reap",
    body: "Enjoy a relaxed daytime schedule to explore Siem Reap or recharge by the pool. Once night falls, get ready to turn up the energy as the group hits the town for a legendary messy pub crawl starting at 8:00 PM.",
    activities: "Nightly messy pub crawl" },
  { label: "Day 6", place: "Siem Reap",
    body: "Head out at 2:00 PM for a floating village tour to experience local life along the waters of Tonle Sap lake. Return to the hostel in the evening for dinner with the group, followed by a lively music quiz and bingo night.",
    activities: "Tonle Sap floating village tour, hostel music quiz & bingo for a cause",
    meals: "Lunch & drink on tour" },
  { label: "Day 7", place: "Siem Reap → Sihanoukville",
    body: "Set an early alarm for the iconic Angkor Wat sunrise tour (4:30 AM – 12:30 PM). Marvel at the ancient temple complex with a guide before heading back for lunch. Later tonight, board an overnight sleeper bus at 7:30 PM bound for Sihanoukville. Note that the Angkor Wat entry pass is purchased in person with ID.",
    transport: "Overnight VIP sleeper bus to Sihanoukville", activities: "Angkor Wat sunrise tour",
    meals: "Tour lunch & drink" },
  { label: "Day 8", place: "Sihanoukville → Koh Rong",
    body: "Arrive in Sihanoukville at 7:00 AM and board the 8:30 AM fast ferry to Koh Rong Longset Pier. Walk to Mad Monkey, check into your beach dorm, and jump straight into beach olympics (2:30 PM – 4:30 PM). Cool down with a free-flow drink session, then wrap up the night with a beach fireshow at 8:30 PM.",
    transport: "Fast ferry to Koh Rong", activities: "Beach olympics, beach fireshow",
    meals: "Free-flow drinks session" },
  { label: "Day 9", place: "Koh Rong",
    body: "Spend the day soaking up the tropical island life on Koh Rong. Join in on the afternoon volleyball tournament (1:30 PM – 3:00 PM), then regroup in the evening for an island Caribbean dinner feast (6:30 PM – 8:30 PM).",
    activities: "Hostel volleyball tournament", meals: "Caribbean dinner" },
  { label: "Day 10", place: "Koh Rong (Nestival)",
    body: "Warm up for the biggest night of the trip with a bottomless brunch featuring a live DJ set. Spend the afternoon relaxing before heading out to Nestival at 7:00 PM, the ultimate beach and jungle rave that keeps pounding until sunrise.",
    activities: "Bottomless brunch with live DJ, Nestival beach & jungle rave ticket",
    meals: "Bottomless brunch (light bite + free-flow drinks)" },
  { label: "Day 11", place: "Koh Rong",
    body: "Recovery day! Take it easy on the beach with complimentary kayak and paddleboard rentals (8:00 AM – 5:00 PM). In the evening, dig into a Sunday roast accompanied by a beer tower, then cap off the night with another beach fireshow at 8:30 PM.",
    activities: "Kayak & paddleboard rental, beach fireshow", meals: "Sunday roast dinner & beer tower" },
  { label: "Day 12", place: "Koh Rong → Koh Sdach",
    body: "Take a 1-hour ferry over to the hidden gem island of Koh Sdach. Settle into Mad Monkey Koh Sdach, check out the spa amenities, and join the afternoon wellness challenge. At 4:00 PM, hop on e-bikes for the Koh Sdach Loop to explore the island, enjoy local beers, and watch the sunset.",
    transport: "Ferry transfer to Koh Sdach", activities: "Hostel wellness challenge, Koh Sdach e-bike loop" },
  { label: "Day 13", place: "Koh Sdach",
    body: "Enjoy a relaxed morning on the island before jumping into an afternoon waterpolo challenge at 2:00 PM. Set sail at 4:00 PM for an island hopping sunset cruise, then wrap up the night back at the hostel with a pub quiz.",
    activities: "Waterpolo challenge, island hopping sunset cruise, hostel pub quiz" },
  { label: "Day 14", place: "Koh Sdach",
    body: "Spend a chill morning fishing off the beach with hostel gear. Jump on another relaxing sunset cruise (4:30 PM – 6:30 PM) before heading back to the hostel for a final make-your-own pizza night with your crew.",
    activities: "Beach fishing gear rental, sunset cruise, make your own pizza night" },
  { label: "Day 15", place: "Koh Sdach → Phnom Penh",
    body: "Say farewell to your squad! Catch the 9:00 AM transfer bus back to Phnom Penh, arriving around 1:00 PM, to connect with your onward travel.",
    transport: "Transfer bus back to Phnom Penh" },
];

export const KH_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "14 days across 4 destinations, all scheduled transport (the bus from Phnom Penh to Siem Reap, the overnight VIP sleeper to Sihanoukville, the fast ferry to Koh Rong, the ferry to Koh Sdach, e-bikes for the island loop and the transfer bus back to Phnom Penh), 24/7 local crew, a free pre-trip night, 1 breakfast, 3 lunches and 5 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey.",
  "What are the main highlights of this trip?":
    "The Angkor Wat sunrise tour, the Nestival beach and jungle rave ticket, the Tonle Sap floating village tour, the S21 and Killing Fields cultural tour, the Koh Sdach e-bike loop, sunset boat cruises in Phnom Penh and on the islands, the bottomless brunch with live DJ, the Siem Reap messy pub crawl, Koh Rong beach olympics and fireshows, and kayak and paddleboard rentals.",
  "What meals are included?": "1 breakfast, 3 lunches and 5 dinners, plus lots of free drinks.",
  "What are the modes of transportation?":
    "A bus from Phnom Penh to Siem Reap, an overnight VIP sleeper bus to Sihanoukville, a fast ferry to Koh Rong, a ferry to Koh Sdach, e-bikes for the Koh Sdach loop, and a transfer bus back to Phnom Penh.",
  "Where will we stay during the trip?":
    "Every stay is in a Mad Monkey property: Phnom Penh, Siem Reap, Koh Rong and Koh Sdach.",
  "What are the visa and entry requirements?":
    "All countries require a valid passport with a minimum 6 months validity. Most nationalities require a tourist visa (Type T) for Cambodia. You can apply online before travel via the official Kingdom of Cambodia e-Visa portal, or get a visa on arrival at international airports and major border crossings. The tourist visa is valid for 30 days on entry and can be extended once for another 30 days in country. Visa information is correct at the time of writing and you are responsible for checking current rules for your country of birth.",
  "What should I know about currency and cards?":
    "The local currency is the Riel, and USD is widely accepted. The best way to carry money is a debit card, withdrawing local cash from ATMs. Travel with both a Visa and a Mastercard in case of a problem with one. USD, EUR, GBP, CAD and AUD cash is useful for when ATMs aren't accessible.",
};
