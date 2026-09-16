// Thailand content, from "Mad-Monkey-Thailand-Trip_1.pdf" (14 Sep 2026).
//
// Unlisted trip: reachable at /thailand only. It is not on the home page, the
// student index or the cross-sell, and the page carries noindex. Same booking
// and payment flow as every other trip.
//
// The brief counts the check-out morning as Day 11 (11 days, 10 nights), so
// `days` is 11 and nights is 10. No photography came with the brief: the
// highlights carry no images (so the section stays hidden) and the hero is
// the generic ALL IN shot until Mad Monkey sends a Thailand one.
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";

export const TH_SNAPSHOT = {
  tripCode: "THAI11",
  days: 11,
  from: "Bangkok",
  to: "Chiang Mai",
  countries: "Thailand",
  blurb:
    "Eleven days of temples, jungle, waterfalls and legendary Mad Monkey nights, from the chaos of Bangkok to the mountains of Pai. You bring yourself; we've sorted the beds, the transport, the crew and the good times.",
};

export const TH_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (tubing, rafting, a few late nights)" },
];

// No photos in the brief yet. Tiles without an image do not render.
export const TH_HIGHLIGHTS: Highlight[] = [
  { title: "Bangkok Old Town: markets, temples & canals", image: null },
  { title: "Bangkok Pub Crawl", image: null },
  { title: "Grand Canyon Water Park, Chiang Mai", image: null },
  { title: "Ethical elephant sanctuary + bamboo rafting", image: null },
  { title: "Sunset at Pai Canyon", image: null },
  { title: "Tipsy tubing in Pai", image: null },
  { title: "Lod Cave day tour", image: null },
];

export const TH_INCLUDED = [
  "11 days, 3 cities",
  "10 nights in Mad Monkey hostels: Bangkok, Chiang Mai and Pai",
  "All intercity transport: the overnight bus north and minivans to Pai and back",
  "24/7 local crew",
  "Every activity in the plan: Old Town tour, elephant sanctuary, bamboo rafting, water park, Lod Cave, Pai tubing and more",
  "The nights out: pub crawls, day parties, game nights, karaoke and Bar Olympics",
  "Welcome BBQ dinner in Chiang Mai and lunch on the elephant day",
  "An instant crew from day one",
];

export const TH_ITINERARY: Day[] = [
  { label: "Day 1", place: "Bangkok",
    body: "Welcome to Thailand! Drop your bags at Mad Monkey Bangkok from 2pm, grab the afternoon to chill by the pool or dive straight into the city, then meet your crew at 8pm for Beats + Bingo to kick things off properly.",
    activities: "Check-in from 2pm, free afternoon, Beats + Bingo from 8pm" },
  { label: "Day 2", place: "Bangkok",
    body: "Time to see the real Bangkok. Wind through the Old Town's markets, temples and canals from 2pm, then wash the day off on the legendary Bangkok Pub Crawl with your new travel family.",
    activities: "Old Town Bangkok tour (markets, temples & canals), Bangkok Pub Crawl 8pm to 1am" },
  { label: "Day 3", place: "Bangkok → Chiang Mai",
    body: "A proper lie-in and a lazy day by the pool before the adventure heads north. At 5pm the overnight bus rolls out from Mad Monkey Bangkok: sleep on wheels and wake up in the mountains.",
    transport: "Overnight bus to Chiang Mai, departs 5pm", activities: "Free daytime" },
  { label: "Day 4", place: "Chiang Mai",
    body: "Morning arrival in laid-back Chiang Mai around 9am. Nap it off or hit the pool, then bring the energy for the Mad Monkey Day Party and BBQ dinner from 4pm before the Ultimate Pub Crawl takes over at 10pm.",
    activities: "Mad Monkey Day Party, Chiang Mai Ultimate Pub Crawl", meals: "BBQ dinner" },
  { label: "Day 5", place: "Chiang Mai",
    body: "Cliff jumps and floating all afternoon at the Grand Canyon Water Park, then back to base for the Mad Monkey Ultimate Game Night. Expect chaos, laughs and a few new legends.",
    activities: "Grand Canyon Water Park 1pm to 6pm, Ultimate Game Night" },
  { label: "Day 6", place: "Chiang Mai",
    body: "The big one. Depart at 8am to meet the elephants at an ethical sanctuary, tuck into lunch, then raft the river on bamboo before heading back for karaoke and a mini pub crawl to round it off.",
    activities: "Elephant sanctuary, bamboo rafting, karaoke + mini pub crawl", meals: "Lunch" },
  { label: "Day 7", place: "Chiang Mai → Pai",
    body: "The famous 762-bend minivan ride up to Pai, worth every turn. Check in to Mad Monkey Pai around 3:30pm, then chase the sunset at Pai Canyon or Two Huts before an easy night on the pub quiz.",
    transport: "Minivan to Pai, departs 12:30pm", activities: "Sunset trip to Pai Canyon or Two Huts, pub quiz" },
  { label: "Day 8", place: "Pai",
    body: "Grab a rubber ring and float the afternoon away on the tipsy tubing session, Pai's finest way to spend a day, then keep it rolling with a karaoke night back at base.",
    activities: "Tipsy tubing 12:30pm to 6:30pm, karaoke night" },
  { label: "Day 9", place: "Pai",
    body: "Go underground on the Lod Cave day tour: bamboo rafts, towering caverns and thousands of swifts at dusk, before Pai's pub crawl sends the night the right way.",
    activities: "Lod Cave day tour 12pm to 6pm, Pai Pub Crawl" },
  { label: "Day 10", place: "Pai → Chiang Mai",
    body: "Wind back down the mountain to Chiang Mai with a free afternoon to relax or squeeze in some last exploring, then send the trip off in style at Bar Olympics + karaoke from 8pm.",
    transport: "Minivan to Chiang Mai", activities: "Free afternoon, Bar Olympics + karaoke" },
  { label: "Day 11", place: "Onward travel",
    body: "All good things... Check out by 11am and carry on: back to Bangkok, on to Hanoi, or wherever's next. Not sure where to head? Have a chat with the team and we'll help you plan the next leg." },
];

export const TH_FAQ_OVERRIDES: Record<string, string> = {
  "What's included?":
    "11 days across 3 cities, 10 nights in Mad Monkey hostels, the overnight bus to Chiang Mai and the minivans to Pai and back, 24/7 local crew, every activity in the itinerary, the nights out, a welcome BBQ dinner in Chiang Mai and lunch on the elephant day.",
  "What are the main highlights of this trip?":
    "Bangkok's Old Town markets, temples and canals, the Bangkok Pub Crawl, the Grand Canyon Water Park, an ethical elephant sanctuary with bamboo rafting, the 762-bend ride up to Pai, sunset at Pai Canyon, tipsy tubing, the Lod Cave day tour, and Mad Monkey nights from Beats + Bingo to Bar Olympics.",
  "What meals are included?":
    "A welcome BBQ dinner at the Chiang Mai day party and lunch on the elephant sanctuary day. Everything else is at your own cost, so eat as you please.",
  "What are the modes of transportation?":
    "The overnight bus from Bangkok to Chiang Mai and minivans between Chiang Mai and Pai, all included. The road to Pai has 762 bends, so pack motion sickness tablets if that's you.",
  "Where will we stay during the trip?":
    "Shared dorms at Mad Monkey Bangkok, Mad Monkey Chiang Mai and Mad Monkey Pai, plus one night on the overnight bus.",
  "What are the visa and entry requirements?":
    "Passports must have at least 6 months validity remaining. Citizens of many countries, including the UK, most of the EU, the USA, Canada, Australia and New Zealand, currently enter Thailand visa-free for up to 60 days. Everyone else can apply for a tourist visa or e-Visa before travel. Visa information is correct at the time of writing and you are responsible for checking current rules for your nationality.",
  "What should I know about currency and cards?":
    "The local currency is the Thai Baht. Cards and ATMs are everywhere in Bangkok and Chiang Mai and fewer in Pai, so carry some cash for tubing, street food and tips. Travel with both a Visa and a Mastercard in case one gives trouble.",
};
