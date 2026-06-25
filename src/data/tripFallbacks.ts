// Static, instant-render fallbacks for each trip slug. Used as React Query
// placeholderData so the page paints fully before Airtable responds.
import type { Trip } from "@/types/trip";
import miaImg from "@/assets/mia.jpg";
import willImg from "@/assets/will.jpg";
import astonImg from "@/assets/aston.jpg";
import sofiaImg from "@/assets/sofia.jpg";

const BASE = {
  videoTestimonialUrl: "",
};

const DUMMY_TESTIMONIALS = [
  {
    name: "Mia",
    age: 24,
    country: "UK",
    photo: miaImg,
    quote: "I met 15 amazing girls who will be friends for life. There is no going back once you do a monkey trip — also every hostel had this crazy view!",
  },
  {
    name: "Will",
    age: 26,
    country: "UK",
    photo: willImg,
    quote: "Mad monkey trips are mad. The biggest jokes I had the whole time — doing it again next week in Cambodia too.",
  },
  {
    name: "Aston",
    age: 25,
    country: "Australia",
    photo: astonImg,
    quote: "I had an amazing experience on the Ha Giang Loop group tour. My driver was incredibly kind and professional. I felt safe every second.",
  },
  {
    name: "Sofia",
    age: 23,
    country: "Ireland",
    photo: sofiaImg,
    quote: "Booked the Vietnam tour solo and was so nervous, but I'd met half the group within an hour. If you're thinking of doing it solo — just book it. 10/10.",
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
      { name: "Uluwatu", nights: 2, description: "", photos: [], activities: [] },
      { name: "Nusa Lembongan", nights: 3, description: "", photos: [], activities: [] },
      { name: "Gili T", nights: 3, description: "", photos: [], activities: [] },
      { name: "Kuta Lombok", nights: 4, description: "", photos: [], activities: [] },
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
    name: "Cambodia Coast to Coast",
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
    name: "Vietnam North to Central",
    slug: "vietnam",
    days: 14,
    stops: [
      { name: "Hanoi", nights: 2, description: "", photos: [], activities: [] },
      { name: "Lan Ha Bay", nights: 1, description: "", photos: [], activities: [] },
      { name: "Hanoi", nights: 1, description: "", photos: [], activities: [] },
      { name: "Ha Giang Loop", nights: 5, description: "", photos: [], activities: [] },
      { name: "Ninh Binh", nights: 1, description: "", photos: [], activities: [] },
      { name: "Hoi An & Da Nang", nights: 3, description: "", photos: [], activities: [] },
    ],
    activityCount: 9,
    heroVideoUrl: "",
    defaultPrice: 850,
    defaultStrikethrough: 1200,
    departures: [],
  },
};

export function getTripFallback(slug: string): Trip | undefined {
  return FALLBACKS[slug];
}
