import { ClosedDepartureCard } from "@/components/trip/BookingFlow";
import type { Departure } from "@/types/trip";

const today = new Date();
const iso = (d: Date) => d.toISOString().split("T")[0];

// Monday departure — closed because we're within 3 days but not past it
const monDep: Departure = {
  id: "test-mon",
  departureId: "IND-2026-06-29",
  date: iso(new Date(today.getTime() + 2 * 86_400_000)), // 2 days out (Monday-ish)
  spotsRemaining: 0,
  bookable: true,
  price: 549,
  strikethrough: null,
};

// Wednesday departure — closed because we're within 1 day but not past it
const wedDep: Departure = {
  id: "test-wed",
  departureId: "VIE-2026-07-01",
  date: iso(new Date(today.getTime() + 1 * 86_400_000)), // 1 day out (Wednesday-ish)
  spotsRemaining: 3,
  bookable: true,
  price: 499,
  strikethrough: null,
};

export default function TestCard() {
  return (
    <div className="min-h-screen bg-mm-pink px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl space-y-8 md:max-w-5xl md:space-y-12">
        <h1 className="font-display text-4xl md:text-6xl">CLOSED DEPARTURE CARD PREVIEW</h1>

        <section className="space-y-4">
          <h2 className="font-sticker text-sm tracking-[0.15em] text-mm-bone/80">INDONESIA / CAMBODIA STYLE (3-DAY CUTOFF)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ClosedDepartureCard dep={monDep} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-sticker text-sm tracking-[0.15em] text-mm-bone/80">VIETNAM STYLE (1-DAY CUTOFF)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ClosedDepartureCard dep={wedDep} />
          </div>
        </section>
      </div>
    </div>
  );
}
