// Kyle, 4 Sep 2026: "this is the 7 day trip, that is actually 8 days on the
// itinerary but the end date says 6 day." The end date comes from `nights`,
// so pin every trip's nights to what its itinerary actually says: the last
// labelled day is the departure morning, nights = that day number - 1.
import { describe, expect, it } from "vitest";
import { TRIPS, tripNights } from "@/data/trips";
import { endDate, tripEndDate } from "@/lib/trip-dates";
import { I7_ITINERARY, I7_SNAPSHOT } from "@/data/trip-content-indonesia7";
import { VN7_ITINERARY, VN7_SNAPSHOT } from "@/data/trip-content-vietnam7";
import { ITINERARY as ID_ITINERARY, SNAPSHOT as ID_SNAPSHOT } from "@/data/trip-content-indonesia";
import { KH_ITINERARY, KH_SNAPSHOT } from "@/data/trip-content-cambodia";
import { VN_ITINERARY, VN_SNAPSHOT } from "@/data/trip-content-vietnam";

const CONTENT = {
  "indonesia-7": { itinerary: I7_ITINERARY, snapshot: I7_SNAPSHOT },
  "vietnam-7": { itinerary: VN7_ITINERARY, snapshot: VN7_SNAPSHOT },
  indonesia: { itinerary: ID_ITINERARY, snapshot: ID_SNAPSHOT },
  cambodia: { itinerary: KH_ITINERARY, snapshot: KH_SNAPSHOT },
  vietnam: { itinerary: VN_ITINERARY, snapshot: VN_SNAPSHOT },
} as const;

const lastDayNumber = (labels: { label: string }[]) => {
  const nums = labels.at(-1)!.label.match(/\d+/g);
  return Number(nums!.at(-1));
};

describe("trip lengths", () => {
  for (const [slug, { itinerary, snapshot }] of Object.entries(CONTENT)) {
    const meta = TRIPS.find((t) => t.slug === slug)!;
    it(`${slug}: nights match the itinerary's departure morning`, () => {
      expect(meta.nights).toBe(lastDayNumber(itinerary) - 1);
    });
    it(`${slug}: "days" copy matches the content snapshot`, () => {
      expect(meta.days).toBe(snapshot.days);
    });
  }
});

describe("endDate", () => {
  it("is the departure morning, `nights` after the start", () => {
    expect(endDate("2026-11-04", 7)).toBe("2026-11-11");
    expect(endDate("2026-11-04", 0)).toBe("2026-11-04");
  });
  it("a 7-day trip runs Wed to the following Wed, not to Tue", () => {
    expect(tripEndDate("2026-11-04", { slug: "vietnam-7", days: 7 })).toBe("2026-11-11");
  });
  it("falls back to days for an unknown slug", () => {
    expect(tripNights({ slug: "nope", days: 5 })).toBe(5);
  });
});
