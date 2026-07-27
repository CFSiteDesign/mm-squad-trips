export interface Stop {
  name: string;
  nights: number;
  description: string;
  photos: string[];
  activities: string[];
}

export interface Testimonial {
  name: string;
  age: number;
  country: string;
  photo: string;
  quote: string;
}

export interface Departure {
  id: string;                 // Airtable record id
  departureId: string;        // "IND-2026-06-29"
  date: string;               // ISO YYYY-MM-DD
  spotsRemaining: number;
  bookable: boolean;
  price: number;              // resolved current price for this departure
  strikethrough: number | null;
  /** Guest-created custom date — hidden from public browsing. */
  isPrivate?: boolean;
}

export interface Trip {
  id: string;
  code: string;               // IND / CAM / VIE
  name: string;
  slug: string;
  days: number;
  stops: Stop[];
  testimonials: Testimonial[];
  activityCount: number;
  heroVideoUrl: string;
  videoTestimonialUrl?: string;
  defaultPrice: number;
  defaultStrikethrough: number;
  /** Only weekday this trip may depart on (Sun=0 … Sat=6, UTC). */
  startWeekday?: number | null;
  departures: Departure[];
}
