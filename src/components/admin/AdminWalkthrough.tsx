import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STORAGE_KEY = "admin_walkthrough_dismissed_v2";

type Step = {
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to the Admin Panel",
    body: "Quick tour of how to manage trips, bookings and squad leaders. Skip anytime — tick \"Don't show again\" to stop it reopening.",
  },
  {
    title: "Two top-level views",
    body: "Top-left toggle: DATABASE shows the raw tables (Trips, Departures, Pricing, Discounts, Bookings). SQUAD LEADERS shows the per-trip squad view with leaders and their booked members.",
  },
  {
    title: "Tabs = Tables",
    body: "In DATABASE view, each tab is one table. TRIPS / DEPARTURES / PRICING / DISCOUNTS are fully editable (add, edit, delete). BOOKINGS is read-only with CSV export.",
  },
  {
    title: "Editing rows",
    body: "Click a row to open the side panel and edit it. Use ADD at the top of a tab to create a new row. Hover any column header for a tooltip explaining the field. Read-only fields (spots remaining, used count, balances) are calculated automatically.",
  },
  {
    title: "Bookings & Groups",
    body: "Group bookings collapse into one LEAD row. Click the [ + N ] button to expand and see every group member with full traveller info. The Balance column shows the automated final-payment status — including the failure reason if a charge failed.",
  },
  {
    title: "Booking References",
    body: "GRP-{TRIP}-NNN = group booking · SOL-{TRIP}-NNN = solo booking, numbered per trip in creation order. The CSV export contains every field, including columns hidden from the on-screen table (UTM, Stripe IDs, raw balance fields, etc.).",
  },
  {
    title: "Refresh & Log Out",
    body: "Top-right: REFRESH re-fetches all cached data (use after editing elsewhere or after a webhook fires). LOG OUT clears your admin session. That's it — happy admin-ing!",
  },
];

export function AdminWalkthrough() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function close() {
    if (dontShow) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-mm-black/60 p-4">
      <div className="relative w-full max-w-md border-[2px] border-mm-black bg-mm-bone p-6 shadow-[6px_6px_0_0_hsl(var(--mm-black))]">
        <button
          onClick={close}
          aria-label="Close walkthrough"
          className="absolute right-2 top-2 p-1 text-mm-black hover:text-mm-pink"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-2 font-sticker text-[10px] tracking-[0.15em] text-mm-pink">
          STEP {step + 1} / {STEPS.length}
        </div>
        <h2 className="font-display text-2xl text-mm-black">{s.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mm-black/80">{s.body}</p>

        <div className="mt-4 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 ${i <= step ? "bg-mm-pink" : "bg-mm-black/20"}`}
            />
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-2 text-xs text-mm-black">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4 accent-mm-pink"
          />
          Don't show this again
        </label>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={close}
            className="rounded-none font-sticker text-[10px] tracking-[0.15em]"
          >
            SKIP
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-none border-[2px] border-mm-black font-sticker text-[10px] tracking-[0.15em]"
              >
                BACK
              </Button>
            )}
            <Button
              onClick={() => (isLast ? close() : setStep((s) => s + 1))}
              className="rounded-none border-[2px] border-mm-black bg-mm-pink font-sticker text-[10px] tracking-[0.15em] text-mm-bone hover:bg-mm-pink/90"
            >
              {isLast ? "DONE" : "NEXT"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
