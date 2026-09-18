// Who is this person: travelling independently, or with a crew?
//
// Kyle, 13 Sep 2026: ALL IN talks to two different people with one message.
// The gate (ModeGate) asks once, the answer is remembered in the browser and
// mirrored as ?mode= in the address bar, and the pages switch their copy on
// it. Links that carry ?mode= skip the gate, so ads and advisors can send
// people straight to the right version. Nothing below the page changes:
// a one-spot booking is already guaranteed (lead_solo), a crew booking keeps
// the 5-traveller minimum.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gtmPushEvent } from "@/utils/gtmTracker";
import type { TripContent } from "@/data/trip-content";

export type TravellerMode = "independent" | "crew";

const STORAGE_KEY = "allin.mode";
export const MODE_PARAM = "mode";

export function parseMode(v: string | null | undefined): TravellerMode | null {
  return v === "independent" || v === "crew" ? v : null;
}

export function readStoredMode(): TravellerMode | null {
  try {
    return parseMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeMode(mode: TravellerMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // private mode; the URL param still carries it for this visit
  }
}

/** For analytics events fired outside the provider (purchase on the success page). */
export function modeParams(): { traveller_mode: TravellerMode | "unknown" } {
  return { traveller_mode: readStoredMode() ?? "unknown" };
}

// The gate never shows here: these links already know their audience, or
// they are back office.
const GATE_FREE = [/^\/checkout/, /^\/booking-success/, /^\/pay-balance/, /^\/squad-leader/, /^\/admin/, /^\/staff-leaderboard/, /^\/students/];

type ModeContextValue = {
  mode: TravellerMode;
  /** True once the visitor has actually picked (or arrived with ?mode=). */
  chosen: boolean;
  gateOpen: boolean;
  choose: (mode: TravellerMode, source: "gate" | "switch") => void;
  openGate: () => void;
  closeGate: () => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function TravellerModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stored, setStored] = useState<TravellerMode | null>(() => readStoredMode());
  const [forcedOpen, setForcedOpen] = useState(false);

  const search = new URLSearchParams(location.search);
  const fromUrl = parseMode(search.get(MODE_PARAM));
  const gateFree = GATE_FREE.some((re) => re.test(location.pathname)) || search.has("date");

  useEffect(() => {
    if (fromUrl && fromUrl !== stored) {
      storeMode(fromUrl);
      setStored(fromUrl);
    }
  }, [fromUrl, stored]);

  const mode: TravellerMode = fromUrl ?? stored ?? "crew";
  const chosen = Boolean(fromUrl ?? stored);
  const gateOpen = forcedOpen || (!chosen && !gateFree);

  const choose = useCallback(
    (next: TravellerMode, source: "gate" | "switch") => {
      storeMode(next);
      setStored(next);
      setForcedOpen(false);
      gtmPushEvent("allin_mode_selected", { traveller_mode: next, mode_source: source });
      const params = new URLSearchParams(window.location.search);
      params.set(MODE_PARAM, next);
      navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true });
    },
    [navigate, location.pathname, location.hash],
  );

  const value = useMemo<ModeContextValue>(
    () => ({ mode, chosen, gateOpen, choose, openGate: () => setForcedOpen(true), closeGate: () => setForcedOpen(false) }),
    [mode, chosen, gateOpen, choose],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// Kyle, 18 Sep 2026: the independent version is "basically the same page but
// removes the messaging about a group". The trip content is written once, for
// crews, so these rewrites take the crew out of each sentence for independent
// visitors. Specific phrases first, exactly as they appear in the content
// files; traveller-mode.test.ts fails if a group phrase slips through.
// "24/7 local crew" and "the crew always plans…" mean Mad Monkey staff and stay.
const INDEPENDENT_REWRITES: Array<[RegExp | string, string]> = [
  ["Settle in before meeting up with your crew for a Welcome Khmer Family Dinner", "Settle in before the Welcome Khmer Family Dinner"],
  ["regroup with the squad for", "head back for"],
  ["then regroup in the evening for", "then in the evening it's"],
  ["a final make-your-own pizza night with your crew", "a final make-your-own pizza night"],
  ["Settle into your home base before meeting up with your crew for a Welcome Sunset session", "Settle into your home base before a Welcome Sunset session"],
  ["regroup with the crew back at the hostel for", "head back to the hostel for"],
  ["Say farewell to your group of newfound friends", "Say farewell to the friends you've made"],
  ["before joining the crew for a traditional Mexican family dinner", "before a traditional Mexican family dinner"],
  ["grab lunch with the crew, and regroup at the hostel tonight", "grab lunch, and head back to the hostel tonight"],
  ["Say farewell to your crew!", "Say your farewells!"],
  ["Say farewell to your squad!", "Say your farewells!"],
  ["then meet your crew at 8pm for Beats + Bingo", "then head to Beats + Bingo at 8pm"],
  ["with your new travel family", "with the people you've met"],
  ["a welcome drink at the hostel to meet your crew", "a welcome drink at the hostel"],
  ["Wake up in Ha Giang, rally your crew, and ride", "Wake up in Ha Giang and ride"],
  ["with a crew that now feels like family", "with new friends who now feel like family"],
  ["Enjoy one last breakfast with your crew and swap contacts", "Enjoy one last breakfast and swap contacts with the friends you've made"],
  ["we've sorted the beds, the transport, the crew and the good times", "we've sorted the beds, the transport, the local team and the good times"],
  ["No coach buses. No 60-person mega-groups. Max 20 people, real backpacker hostels, free time built in.", "No coach buses. Real backpacker hostels, a fixed route and free time built in."],
  [/\s*If we cancel because the departure didn't reach its 5-traveller minimum, you get a full refund automatically\./, ""],
];

export function independentText(s: string): string {
  let out = s;
  for (const [from, to] of INDEPENDENT_REWRITES) out = out.replace(from, to);
  return out;
}

/** FAQ entries that only make sense for a crew. */
const CREW_ONLY_FAQ = /reach the minimum|leading the group|number of participants|group size|squad/i;

/** The trip FAQ, minus the group promises, for independent travellers. */
export function independentFaqs<T extends { q: string; a: string }>(faqs: T[]): T[] {
  return faqs
    .filter((f) => !CREW_ONLY_FAQ.test(f.q))
    .map((f) =>
      /after I pay (my|the) deposit/i.test(f.q)
        ? {
            ...f,
            a: "You get an email with your booking reference and your trip is confirmed straight away. Independent bookings always run, so book your flights whenever you're ready. The remaining balance is charged automatically to the same card 7 days before departure, no action needed.",
          }
        : { ...f, q: independentText(f.q), a: independentText(f.a) },
    );
}

/** The same trip page content with every group promise taken out. */
export function independentContent(c: TripContent): TripContent {
  const t = independentText;
  return {
    ...c,
    snapshot: { ...c.snapshot, blurb: t(c.snapshot.blurb) },
    isThisForMe: c.isThisForMe.map((r) => (/group size/i.test(r.k) ? { k: "Booking", v: "Just you. Every date runs." } : { k: t(r.k), v: t(r.v) })),
    highlights: c.highlights.map((h) => ({ ...h, title: t(h.title) })),
    included: c.included.filter((i) => !/instant crew|ready-made group/i.test(i)).map(t),
    itinerary: c.itinerary.map((d) => ({
      ...d,
      place: t(d.place),
      body: t(d.body),
      transport: d.transport ? t(d.transport) : d.transport,
      activities: d.activities ? t(d.activities) : d.activities,
      meals: d.meals ? t(d.meals) : d.meals,
    })),
    faqs: independentFaqs(c.faqs),
  };
}

const FALLBACK: ModeContextValue = { mode: "crew", chosen: true, gateOpen: false, choose: () => {}, openGate: () => {}, closeGate: () => {} };

export function useTravellerMode(): ModeContextValue {
  return useContext(ModeContext) ?? FALLBACK;
}
