import type { Trip } from "@/types/trip";

function isoDaysFromNow(daysFromToday: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function buildDepartures(code: string, basePrice: number) {
  return [
    { id: `${code.toLowerCase()}-dep-1`, departureId: `${code}-${isoDaysFromNow(18)}`, date: isoDaysFromNow(18), spotsRemaining: 18, bookable: true, price: basePrice, strikethrough: basePrice + 120 },
    { id: `${code.toLowerCase()}-dep-2`, departureId: `${code}-${isoDaysFromNow(41)}`, date: isoDaysFromNow(41), spotsRemaining: 9, bookable: true, price: basePrice + 40, strikethrough: basePrice + 160 },
    { id: `${code.toLowerCase()}-dep-3`, departureId: `${code}-${isoDaysFromNow(76)}`, date: isoDaysFromNow(76), spotsRemaining: 4, bookable: true, price: basePrice + 80, strikethrough: basePrice + 180 },
  ];
}

const FALLBACK_TRIPS: Record<string, Trip> = {
  indonesia: {
    id: "fallback-indonesia",
    code: "IND",
    name: "Indonesia Island Hopping",
    slug: "indonesia",
    days: 12,
    stops: [
      { name: "Canggu", nights: 2, description: "Welcome nights, beach clubs, and easy crew bonding from the first hostel check-in.", photos: [], activities: ["Welcome party", "Sunset drinks"] },
      { name: "Gili T", nights: 4, description: "Boat days, reef snorkelling, and long social nights built around the island hostel scene.", photos: [], activities: ["Snorkel trip", "Bike loop", "Boat party"] },
      { name: "Lombok", nights: 3, description: "Waterfalls, local villages, and recovery pool days before the final run home.", photos: [], activities: ["Waterfall day", "Beach afternoon"] },
      { name: "Uluwatu", nights: 2, description: "Clifftop sunsets and one last big crew night before departure.", photos: [], activities: ["Temple visit", "Farewell dinner"] },
    ],
    testimonials: [
      { name: "Emily", age: 26, country: "UK", photo: "", quote: "I arrived solo and left with plans to meet half the group again later in Thailand." },
      { name: "Luca", age: 24, country: "Italy", photo: "", quote: "The trip felt organised enough to relax, but never rigid or overproduced." },
    ],
    activityCount: 11,
    heroVideoUrl: "",
    videoTestimonialUrl: "",
    defaultPrice: 700,
    defaultStrikethrough: 840,
    departures: buildDepartures("IND", 700),
  },
  cambodia: {
    id: "fallback-cambodia",
    code: "CAM",
    name: "Cambodia Coast to Coast",
    slug: "cambodia",
    days: 14,
    stops: [
      { name: "Phnom Penh", nights: 2, description: "Start strong with rooftop drinks, history, and a fast-moving hostel energy.", photos: [], activities: ["City walk", "Welcome dinner"] },
      { name: "Siem Reap", nights: 3, description: "Temple sunrise mornings and big social nights around Pub Street.", photos: [], activities: ["Angkor Wat", "Night market"] },
      { name: "Koh Rong", nights: 4, description: "White sand beaches, boat sessions, and pure island group-trip mode.", photos: [], activities: ["Boat cruise", "Beach games"] },
      { name: "Koh Sdach", nights: 3, description: "A slower castaway stretch with snorkelling and crew dinners by the water.", photos: [], activities: ["Snorkelling", "Sunset barbecue"] },
    ],
    testimonials: [
      { name: "Sophie", age: 27, country: "Australia", photo: "", quote: "The Cambodia route had the perfect mix of chaos, beach time, and genuinely good people." },
      { name: "Noah", age: 25, country: "Canada", photo: "", quote: "I booked for the itinerary and stayed for the group dynamic — it clicked immediately." },
    ],
    activityCount: 12,
    heroVideoUrl: "",
    videoTestimonialUrl: "",
    defaultPrice: 650,
    defaultStrikethrough: 790,
    departures: buildDepartures("CAM", 650),
  },
  vietnam: {
    id: "fallback-vietnam",
    code: "VIE",
    name: "Vietnam North Loop",
    slug: "vietnam",
    days: 10,
    stops: [
      { name: "Hanoi", nights: 2, description: "Street food, old quarter energy, and the first group night in the city.", photos: [], activities: ["Food crawl", "Beer street"] },
      { name: "Ha Giang", nights: 3, description: "Big views, motorbike loop days, and some of the strongest shared moments of the trip.", photos: [], activities: ["Loop ride", "Mountain homestay"] },
      { name: "Cao Bang", nights: 2, description: "Waterfalls and remote scenery that gives the route a true expedition feel.", photos: [], activities: ["Ban Gioc Falls", "Local dinner"] },
      { name: "Halong", nights: 2, description: "Cruise finish with caves, swimming, and a calmer final night together.", photos: [], activities: ["Bay cruise", "Kayaking"] },
    ],
    testimonials: [
      { name: "Mia", age: 23, country: "Germany", photo: "", quote: "Vietnam felt like a real adventure without any of the usual planning stress." },
      { name: "Jake", age: 29, country: "USA", photo: "", quote: "The north loop section was unreal, and the crew made it even better than the scenery." },
    ],
    activityCount: 10,
    heroVideoUrl: "",
    videoTestimonialUrl: "",
    defaultPrice: 750,
    defaultStrikethrough: 910,
    departures: buildDepartures("VIE", 750),
  },
};

export function getFallbackTrip(slug: string): Trip | undefined {
  return FALLBACK_TRIPS[slug];
}