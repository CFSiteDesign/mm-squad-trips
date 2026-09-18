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

/** The trip FAQ, minus the group promises, for independent travellers. */
export function independentFaqs<T extends { q: string; a: string }>(faqs: T[]): T[] {
  return faqs
    .filter((f) => !/reach the minimum/i.test(f.q))
    .map((f) =>
      /after I pay (my|the) deposit/i.test(f.q)
        ? {
            ...f,
            a: "You get an email with your booking reference and your trip is confirmed straight away. Independent bookings always run, so book your flights whenever you're ready. The remaining balance is charged automatically to the same card 7 days before departure, no action needed.",
          }
        : f,
    );
}

const FALLBACK: ModeContextValue = { mode: "crew", chosen: true, gateOpen: false, choose: () => {}, openGate: () => {}, closeGate: () => {} };

export function useTravellerMode(): ModeContextValue {
  return useContext(ModeContext) ?? FALLBACK;
}
