// Copy for the ALL IN home page. Lives here rather than in AllInHome.tsx so the
// build-time prerender (src/seo/prerender.ts) prints exactly what the page
// says: crawlers and people read the same words.

export const HERO_SUB = {
  crew: "Stop herding cats. 7 to 14-day epic adventures across Asia with the ultimate backpacker crew. Real Mad Monkey beds, zero planning, and flexible payment plans.",
  independent: "Stop planning. 7 to 14-day adventures across Asia with the route, boats and beds sorted for you. Real Mad Monkey hostels, guaranteed to run, flexible payment plans.",
};

/** Same order as the icons in AllInHome (bed, people, sparkles). */
export const DIFFERENT_CREW = [
  { title: "NO MYSTERY DORMS.", body: "Sleep in actual Mad Monkey beds every night." },
  { title: "SOLO? NOT FOR LONG.", body: "Join a crew of 20 like-minded backpackers." },
  { title: "ZERO PLANNING STRESS.", body: "We handle the routes, the boats, and the beds." },
];
export const DIFFERENT_INDEPENDENT = [
  { title: "NO MYSTERY DORMS.", body: "Sleep in actual Mad Monkey beds every night." },
  { title: "YOUR TRIP, YOUR PACE.", body: "No group to keep up with. Meet people at every hostel, on your terms." },
  { title: "ZERO PLANNING STRESS.", body: "We handle the routes, the boats, and the beds." },
];

export const INCLUDED = [
  "All transfers + island boats", "24/7 local crew", "Free pre-trip night",
  "Breakfasts, lunches + dinners", "Loads of free drinks", "Every activity in the itinerary",
  "Dorm beds at Mad Monkey",
];
export const NOT_INCLUDED = ["Flights", "Travel insurance", "Personal expenses", "Upgrades + add-ons"];

export const RATING_LINE = "RATED 4.9/5 BY 53,000+ MAD MONKEY TRAVELLERS";
