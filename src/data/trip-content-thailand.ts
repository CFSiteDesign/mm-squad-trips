// Thailand content, first from "Mad-Monkey-Thailand-Trip_1.pdf" (14 Sep 2026),
// updated to "Mad_Monkey_ALL_IN_Thailand_11-Day_Dev_Spec.pdf" (15 Oct 2026):
// the page is published (listed, indexed) and follows that spec.
//
// The check-out morning counts as Day 11 (11 days, 10 nights: 9 in Mad Monkey
// hostels plus the overnight bus), so `days` is 11 and nights is 10. No free
// drinks on this trip: don't list them. No photography came with either
// brief, so the photos are generic ones from madmonkeyhostels.com (19 Oct
// 2026). The tubing shot was taken in Vang Vieng, and there is no Lod Cave
// photo yet, so that tile stays hidden until one arrives.
import type { Day } from "@/data/trip-content-indonesia";
import type { Highlight } from "@/data/trip-content";
import oldTown from "@/assets/th-hl-old-town.jpg";
import pubCrawl from "@/assets/th-hl-pub-crawl.jpg";
import grandCanyon from "@/assets/th-hl-grand-canyon.jpg";
import elephants from "@/assets/th-hl-elephants.jpg";
import paiCanyon from "@/assets/th-hl-pai-canyon.jpg";
import tubing from "@/assets/th-hl-tubing.jpg";

export const TH_SNAPSHOT = {
  tripCode: "THAI11",
  days: 11,
  from: "Bangkok",
  to: "Chiang Mai",
  countries: "Thailand",
  blurb:
    "Eleven days of temples, jungle, waterfalls and legendary Mad Monkey nights, from Bangkok's Old Town up through Chiang Mai to the mountains of Pai. You bring yourself; we've sorted the beds, the transport, the crew and the good times.",
};

export const TH_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (tubing, rafting, a few late nights)" },
];

// Tiles without an image do not render (Lod Cave has no photo yet).
export const TH_HIGHLIGHTS: Highlight[] = [
  { title: "Bangkok Old Town: markets, temples & canals", image: oldTown },
  { title: "Bangkok Pub Crawl", image: pubCrawl },
  { title: "Grand Canyon Water Park, Chiang Mai", image: grandCanyon },
  { title: "Ethical elephant sanctuary + bamboo rafting", image: elephants },
  // The crew picks the spot on the day; a sunset tour runs either way.
  { title: "Sunset trip to Pai Canyon or Two Huts", image: paiCanyon },
  { title: "Tipsy tubing in Pai", image: tubing },
  { title: "Lod Cave day tour", image: null },
];

export const TH_INCLUDED = [
  "11 days, 3 destinations",
  "9 nights in Mad Monkey hostels (Bangkok, Chiang Mai and Pai) + 1 overnight bus",
  "All intercity transport: the overnight bus north and minivans to Pai and back",
  "24/7 local crew",
  "Free pre-night: arrive the night before and it's on us",
  "Free breakfast every morning, plus lunch on the elephant day and a welcome BBQ dinner in Chiang Mai",
  "Every activity in the itinerary: Old Town tour, elephant sanctuary, bamboo rafting, water park, Lod Cave, Pai tubing and more",
  "The nights out: pub crawls, day parties, game nights, karaoke and Bar Olympics",
];

export const TH_NOT_INCLUDED = ["Flights", "Travel insurance (required)", "Personal expenses", "Upgrades and add-ons"];

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
    transport: "Pick-up 8am", activities: "Elephant sanctuary, bamboo rafting, karaoke + mini pub crawl", meals: "Lunch" },
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
    transport: "Minivan, time set by the Pai crew", activities: "Free afternoon, Bar Olympics + karaoke" },
  { label: "Day 11", place: "Chiang Mai",
    body: "All good things... Check out by 11am and carry on: back to Bangkok, on to Hanoi, or wherever's next. Not sure where to head? Have a chat with the team and we'll help you plan the next leg." },
];
