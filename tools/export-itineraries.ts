// Prints every ALL IN trip's day-by-day as JSON, for the Experience Database's
// allin_trip_days table (costing-tool migration 020_allin.sql). Re-run and
// re-load after itinerary copy changes on the trip pages:
//   npx vite-node tools/export-itineraries.ts > /tmp/allin-days.json
import { KH_ITINERARY } from "@/data/trip-content-cambodia";
import { ITINERARY as INDO_ITINERARY } from "@/data/trip-content-indonesia";
import { I7_ITINERARY } from "@/data/trip-content-indonesia7";
import { LA_ITINERARY } from "@/data/trip-content-laos";
import { TH_ITINERARY } from "@/data/trip-content-thailand";
import { VN_ITINERARY } from "@/data/trip-content-vietnam";
import { VN7_ITINERARY } from "@/data/trip-content-vietnam7";

const trips = {
  cambodia: KH_ITINERARY,
  indonesia: INDO_ITINERARY,
  "indonesia-7": I7_ITINERARY,
  laos: LA_ITINERARY,
  thailand: TH_ITINERARY,
  vietnam: VN_ITINERARY,
  "vietnam-7": VN7_ITINERARY,
};

// "Day 4" or "Days 10–12": an entry can cover a run of days.
function dayRange(label: string, fallback: number): [number, number] {
  const n = label.match(/\d+/g)?.map(Number) ?? [];
  return n.length ? [n[0], n[n.length - 1]] : [fallback, fallback];
}

const rows = Object.entries(trips).flatMap(([slug, days]) =>
  days.map((d, i) => ({
    trip_slug: slug,
    day_from: dayRange(d.label, i + 1)[0],
    day_to: dayRange(d.label, i + 1)[1],
    label: d.label,
    place: d.place,
    body: d.body,
    transport: d.transport ?? null,
    activities: d.activities ?? null,
    meals: d.meals ?? null,
  })),
);
process.stdout.write(JSON.stringify(rows));
