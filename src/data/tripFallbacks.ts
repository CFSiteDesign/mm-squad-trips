// Static, instant-render fallbacks for each trip slug. Used as React Query
// placeholderData so the page paints fully before Airtable responds.
import type { Trip } from "@/types/trip";

const BASE = {
  videoTestimonialUrl: "",
};

const DUMMY_TESTIMONIALS = [
  {
    name: "Jake",
    age: 26,
    country: "UK",
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    quote: "Best trip of my life. Made mates for life and the itinerary was unreal.",
  },
  {
    name: "Sophie",
    age: 24,
    country: "Australia",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    quote: "I came solo and left with a squad. The hosts made everything so easy.",
  },
  {
    name: "Liam",
    age: 28,
    country: "Ireland",
    photo: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face",
    quote: "Non-stop laughs, epic spots, and zero stress. Already booked my next one.",
  },
  {
    name: "Emma",
    age: 25,
    country: "Canada",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    quote: "Mad Monkey knows how to show you a good time. Highly recommend!",
  },
];

const FALLBACKS: Record<string, Trip> = {
  indonesia: {
    ...BASE,
    testimonials: DUMMY_TESTIMONIALS,
    id: "placeholder-indonesia",
    code: "IND",
    name: "Indonesia Island Hopping",
    slug: "indonesia",
    days: 12,
    stops: [
      { name: "Bali", nights: 4, description: "", photos: [], activities: [] },
      { name: "Lembongan", nights: 4, description: "", photos: [], activities: [] },
      { name: "Gili Islands", nights: 4, description: "", photos: [], activities: [] },
    ],
    activityCount: 8,
    heroVideoUrl: "",
    defaultPrice: 700,
    defaultStrikethrough: 1140,
    departures: [],
  },
  cambodia: {
    ...BASE,
    testimonials: DUMMY_TESTIMONIALS,
    id: "placeholder-cambodia",
    code: "CAM",
    name: "Cambodia",
    slug: "cambodia",
    days: 14,
    stops: [
      { name: "Phnom Penh", nights: 3, description: "", photos: [], activities: [] },
      { name: "Siem Reap", nights: 4, description: "", photos: [], activities: [] },
      { name: "Sihanoukville", nights: 3, description: "", photos: [], activities: [] },
    ],
    activityCount: 7,
    heroVideoUrl: "",
    defaultPrice: 650,
    defaultStrikethrough: 1050,
    departures: [],
  },
  vietnam: {
    ...BASE,
    testimonials: DUMMY_TESTIMONIALS,
    id: "placeholder-vietnam",
    code: "VIE",
    name: "Vietnam",
    slug: "vietnam",
    days: 10,
    stops: [
      { name: "Hanoi", nights: 3, description: "", photos: [], activities: [] },
      { name: "Ha Long Bay", nights: 2, description: "", photos: [], activities: [] },
      { name: "Hoi An", nights: 4, description: "", photos: [], activities: [] },
      { name: "Ho Chi Minh", nights: 5, description: "", photos: [], activities: [] },
    ],
    activityCount: 9,
    heroVideoUrl: "",
    defaultPrice: 750,
    defaultStrikethrough: 1200,
    departures: [],
  },
};

export function getTripFallback(slug: string): Trip | undefined {
  return FALLBACKS[slug];
}
