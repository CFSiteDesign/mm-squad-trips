// Laos Ultimate content, from "Mad_Monkey_ALL_IN_Laos_Ultimate_10-Day_Dev_Spec.pdf"
// (15 Oct 2026), built on the Mad Monkey product sheet (28 Sep 2026) and ops answers.
//
// The checkout morning counts as Day 10 (10 days, 9 nights). Two of the nine
// nights are not at Mad Monkey (a mountain camp in Nong Khiaw and a homestay
// in Muang Ngoi), so nothing on this page says Mad Monkey beds "every night".
// No free drinks on this trip: don't list them.
//
// Still open with ops (15 Oct 2026), so left off the page rather than guessed:
// whether the Day 5 homestay dinner is included, how the group gets from Muang
// Ngoi back to Luang Prabang on Day 6, and breakfast at the camp and the
// homestay. No photography came with the spec, so the photos are generic
// ones from madmonkeyhostels.com (19 Oct 2026). There is no paramotor photo
// yet, so that tile stays hidden until one arrives.
import type { Day } from "@/data/trip-content-indonesia";
import type { AddOn, Highlight } from "@/data/trip-content";
import kuangSi from "@/assets/la-hl-kuang-si.jpg";
import tubing from "@/assets/la-hl-tubing.jpg";
import viewpoint from "@/assets/la-hl-viewpoint.jpg";
import lpbPool from "@/assets/la-hl-lpb-pool.jpg";
import vvPool from "@/assets/la-hl-vv-pool.jpg";
import pubCrawl from "@/assets/la-hl-pub-crawl.jpg";

export const LA_SNAPSHOT = {
  tripCode: "LAOS10",
  days: 10,
  from: "Luang Prabang",
  to: "Vang Vieng",
  countries: "Laos",
  blurb:
    "Sleep is optional. Stories are guaranteed. Ten days across the very best of northern Laos: swim the turquoise pools of Kuang Si Falls and wander the golden temples of Luang Prabang, camp on a mountain top above Nong Khiaw and sleep in a river village in car-free Muang Ngoi, then hit Vang Vieng for caves, kayaking, ziplines, tubing and a sunset paramotor flight over the karsts. Seven of your nine nights are in Mad Monkey beds, so the crew and the parties come built in.",
};

export const LA_IS_THIS_FOR_ME = [
  { k: "Vibe", v: "Adventure by day, big nights out" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (viewpoint hikes, kayaking, a night camping)" },
];

// Tiles without an image do not render (the paramotor has no photo yet).
export const LA_HIGHLIGHTS: Highlight[] = [
  { title: "Kuang Si Falls: swim the turquoise pools", image: kuangSi },
  { title: "Sunset paramotor flight over the karsts", image: null },
  { title: "Tipsy tubing: floating down the Nam Song", image: tubing },
  { title: "Karst viewpoints: Vang Vieng from the top", image: viewpoint },
  { title: "Pool parties at Mad Monkey Luang Prabang", image: lpbPool },
  { title: "Pool with a view at Mad Monkey Vang Vieng", image: vvPool },
  { title: "Vang Vieng pub crawl: one crew, one big night", image: pubCrawl },
];

export const LA_INCLUDED = [
  "10 days, 4 destinations",
  "9 nights: 7 at Mad Monkey (Luang Prabang and Vang Vieng), plus a mountain camp in Nong Khiaw and a homestay in Muang Ngoi",
  "All transfers: minivans, river boats and the high-speed train",
  "24/7 local crew",
  "Free pre-night: arrive the night before and it's on us",
  "Free breakfast every morning at Mad Monkey, plus lunch on the Kuang Si day and the Vang Vieng day tour",
  "Kuang Si Falls tour",
  "Luang Prabang culture tour and jewellery class",
  "Nong Khiaw and Muang Ngoi adventure",
  "Vang Vieng day tour: lagoons, cave and kayak",
  "Sunset paramotor, zipline and tipsy tubing",
  "The nights out: bowling, pool parties and pub crawl",
];

export const LA_NOT_INCLUDED = [
  "International flights",
  "Travel insurance (required)",
  "Meals not listed and personal spending",
  "Mount Phousi entry and the Day 2 market breakfast",
  "Upgrades and add-ons",
];

// The spec's day headline tag (Kuang Si Falls, Culture day...) opens each day.
// Breakfast is free on mornings at Mad Monkey, so it sits in the inclusions
// rather than on every day; the meals line shows only the extra meals.
export const LA_ITINERARY: Day[] = [
  { label: "Day 1", place: "Luang Prabang",
    body: "Check in to Mad Monkey Luang Prabang, roam the Old Town, riverside cafés or the pool, then dinner at the night market." },
  { label: "Day 2", place: "Luang Prabang",
    body: "Kuang Si Falls. Optional sunrise alms giving and Mount Phousi, then the Kuang Si Waterfall tour with lunch included. Night market after.",
    meals: "Lunch" },
  { label: "Day 3", place: "Luang Prabang",
    body: "Culture day. Stories of Luang Prabang culture tour: the National Museum, UXO Centre and Royal Palace, then jewellery making at the Garden of Eden." },
  { label: "Day 4", place: "Luang Prabang → Nong Khiaw",
    body: "Mountain camp. Road trip north to Nong Khiaw, a local museum and a mountain viewpoint hike, then camp out on the mountain top.",
    transport: "Minivan" },
  { label: "Day 5", place: "Nong Khiaw → Muang Ngoi",
    body: "River boats. Boat to a Khmu village and waterfall, then upriver to car-free Muang Ngoi for a viewpoint climb and a homestay village dinner.",
    transport: "River boat" },
  { label: "Day 6", place: "Muang Ngoi → Luang Prabang",
    body: "Bowling. Head back to Mad Monkey Luang Prabang for night market eats and a bowling night with the crew.",
    transport: "Transfer back to Luang Prabang" },
  { label: "Day 7", place: "Luang Prabang → Vang Vieng",
    body: "Paramotor. High-speed train to Vang Vieng (about 55 min), a sunset tandem paramotor flight over the karsts, then the pub crawl.",
    transport: "High-speed train, about 55 min" },
  { label: "Day 8", place: "Vang Vieng",
    body: "Blue Lagoons. Full-day tour: Nam Xay viewpoint, Blue Lagoons 1, 2 and 3, Nang Far Cave and kayaking, with lunch. Riverside sunset bars after.",
    meals: "Lunch" },
  { label: "Day 9", place: "Vang Vieng",
    body: "Tubing. Zipline and the Phakai viewpoint, tipsy tubing on the Nam Song, then a farewell night out with the crew." },
  { label: "Day 10", place: "Vang Vieng",
    body: "One last swim, check out and onward travel." },
];

// "Want to go bigger?": paid extras, not part of the from price. The sunset
// paramotor is included (Day 7), so it is never listed here.
export const LA_ADD_ONS: AddOn[] = [
  { name: "Hot air balloon ride", price: "+$110",
    body: "See Vang Vieng's karst mountains and the Nam Song river from above on a hot air balloon flight over the valley." },
  { name: "Ethical elephant experience at MandaLao", price: "+$99",
    body: "Spend time with elephants at MandaLao, an ethical sanctuary near Luang Prabang, watching and walking alongside them rather than riding." },
];
export const LA_ADD_ONS_NOTE = "Ask us online or at the hostel for times and booking.";

export const LA_GOOD_TO_KNOW =
  "Some activities are weather dependent and may be re-timed, swapped or cancelled on the day for safety. The Kuang Si Falls trip runs with a minimum of 3 people. Where an activity can't run, the crew will offer an alternative.";
