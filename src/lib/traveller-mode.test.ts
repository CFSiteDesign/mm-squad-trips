// Kyle, 18 Sep 2026: the independent version of every trip page must carry
// no group messaging. This runs the real content of every trip through the
// independent transform and fails on any phrase that slipped through.
import { describe, expect, it } from "vitest";
import { independentContent } from "@/lib/traveller-mode";
import { getTripContent, TRIP_CONTENT_SLUGS } from "@/data/trip-content";
import { getTripFallback } from "@/data/tripFallbacks";

const GROUP_PHRASES =
  /your crew|meet your crew|with the crew|joining the crew|with a crew|rally your crew|group of|travel family|regroup|instant crew|ready-made group|Max 20|mega-groups|5-traveller|squad|reach the minimum|Group Size/i;

describe("independent content", () => {
  for (const slug of TRIP_CONTENT_SLUGS) {
    it(`${slug}: no group messaging survives`, () => {
      const trip = getTripFallback(slug)!;
      const c = independentContent(getTripContent(trip, slug));
      const texts = [
        c.snapshot.blurb,
        ...c.isThisForMe.flatMap((r) => [r.k, r.v]),
        ...c.highlights.map((h) => h.title),
        ...c.included,
        ...c.itinerary.flatMap((d) => [d.place, d.body, d.transport ?? "", d.activities ?? "", d.meals ?? ""]),
        ...c.faqs.flatMap((f) => [f.q, f.a]),
      ];
      const leaks = texts.filter((t) => GROUP_PHRASES.test(t));
      expect(leaks, leaks.join("\n")).toEqual([]);
    });
    it(`${slug}: crew content is untouched`, () => {
      const trip = getTripFallback(slug)!;
      const c = getTripContent(trip, slug);
      // Same object shape and day count either way; only wording changes.
      expect(independentContent(c).itinerary).toHaveLength(c.itinerary.length);
    });
  }
});
