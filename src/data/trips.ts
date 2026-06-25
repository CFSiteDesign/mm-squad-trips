export type Filter = "ALL" | "Indonesia" | "Cambodia" | "Vietnam";

export type TripCard = {
  slug: string;
  country: Filter;
  name: string;
  sub: string;
  route: string;
  days: number;
  price: number;
  accent: "orange" | "lime" | "pink" | "cyan";
};

export const TRIPS: TripCard[] = [
  { slug: "indonesia", country: "Indonesia", name: "Indonesia",  sub: "Island hopping",  route: "Bali → Gili T → Lombok → Uluwatu",                days: 12, price: 700, accent: "orange" },
  { slug: "cambodia",  country: "Cambodia",  name: "Cambodia",   sub: "Coast to coast",  route: "Phnom Penh → Siem Reap → Koh Rong → Koh Sdach",   days: 14, price: 650, accent: "lime"   },
  { slug: "vietnam",   country: "Vietnam",   name: "Vietnam",    sub: "North to central Vietnam",      route: "Hanoi → Ha Long Bay → Ha Giang Loop → Danang → Hoi An",    days: 14, price: 850, accent: "pink"   },
];

export const ACCENT_BG: Record<TripCard["accent"], string> = {
  orange: "bg-mm-orange",
  lime: "bg-mm-lime",
  pink: "bg-mm-pink",
  cyan: "bg-mm-cyan",
};
