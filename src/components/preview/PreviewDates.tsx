// "Dates & Availability" for the Aug 2026 preview, laid out like the G
// Adventures dates: full width of the boxed section, one narrow row per date,
// with month toggles above.
//
// Presentation only. Every "Book now" hands off to the real BookingFlow below,
// so the live booking mechanics (deposits, squad codes, solo handling,
// discounts) are untouched.
import { useMemo, useState } from "react";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/trip-helpers";
import type { Trip } from "@/types/trip";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";

const CUSTOM_DATES_EMAIL = "creatorhub@madmonkeyhostels.com";

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) =>
  new Date(key + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function endDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.max(0, days - 1));
  return d.toISOString().slice(0, 10);
}

export function PreviewDates({ trip, onBook }: { trip: Trip; onBook: () => void }) {
  const departures = useMemo(
    () => [...(trip.departures ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [trip.departures],
  );
  const months = useMemo(() => {
    const seen: string[] = [];
    for (const d of departures) if (!seen.includes(monthKey(d.date))) seen.push(monthKey(d.date));
    return seen;
  }, [departures]);
  const [month, setMonth] = useState<string>(months[0] ?? "");
  const rows = departures.filter((d) => monthKey(d.date) === (month || months[0]));

  const weekday = trip.startWeekday;
  const weekdayName =
    weekday === null || weekday === undefined
      ? null
      : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(weekday)];

  return (
    <div className="border-[3px] border-mm-black bg-mm-purple/10">
      {/* Solo + Squad, stacked above the dates. Replaces the position G
          Adventures uses for "Make it a private tour". */}
      <div className="space-y-3 border-b-[3px] border-mm-black p-4 md:p-6">
        <div className="border-[3px] border-mm-black bg-mm-lime p-4">
          <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">✔ SOLO TRAVELLER? YOU'RE COVERED</p>
          <p className="mt-2 text-sm leading-snug text-mm-black/80">
            Lock in your spot with total peace of mind. Easy single booking, 100% departure rate,
            and zero fuss. Just show up and experience all the best bits.
          </p>
        </div>
        <div className="border-[3px] border-mm-black bg-mm-cyan p-4">
          <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">
            ✔ BRING YOUR SQUAD (AND GO FOR FREE)
          </p>
          <p className="mt-2 text-sm leading-snug text-mm-black/80">{SQUAD_BENEFITS.free.body}</p>
        </div>
      </div>

      {/* Month toggles */}
      <div className="flex gap-2 overflow-x-auto border-b-[3px] border-mm-black p-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`whitespace-nowrap border-[3px] border-mm-black px-3 py-1.5 font-sans text-[12px] font-bold transition-colors ${
              (month || months[0]) === m ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black hover:bg-mm-yellow"
            }`}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* One narrow row per date, full width of the box */}
      <div className="space-y-2 p-4 md:p-6">
        {rows.map((d) => {
          const soldOut = !d.bookable || d.spotsRemaining <= 0;
          return (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-[3px] border-mm-black bg-mm-bone px-4 py-3"
            >
              <div className="min-w-[92px]">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/50">Start date</p>
                <p className="font-display text-lg leading-none text-mm-black">{dayLabel(d.date)}</p>
              </div>
              <div className="min-w-[92px]">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/50">End date</p>
                <p className="font-display text-lg leading-none text-mm-black">{dayLabel(endDate(d.date, trip.days))}</p>
              </div>
              <div className="flex min-w-[130px] items-center gap-1.5 text-sm">
                {soldOut ? (
                  <><AlertCircle className="h-4 w-4 text-mm-orange" /> <span className="text-mm-black/70">Join the waitlist</span></>
                ) : (
                  <><Check className="h-4 w-4 text-mm-black" strokeWidth={3} /> <span className="text-mm-black/80">{d.spotsRemaining} available</span></>
                )}
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right">
                  {d.strikethrough && d.strikethrough > d.price && (
                    <span className="mr-2 text-xs text-mm-black/45 line-through">{formatPrice(d.strikethrough)}</span>
                  )}
                  <span className="font-display text-lg text-mm-black">{formatPrice(d.price)}</span>
                  <span className="text-xs text-mm-black/60">/person</span>
                </div>
                <button
                  onClick={onBook}
                  className="border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
                >
                  {soldOut ? "REQUEST" : "BOOK NOW"}
                </button>
              </div>
            </div>
          );
        })}

        {/* CUSTOM DATES — always pinned below the list, on every month, whether
            the guest is booking solo or as a squad. */}
        <div className="mt-4 border-[3px] border-mm-black bg-mm-yellow p-4">
          <p className="font-sticker text-[11px] tracking-[0.14em] text-mm-black">✳ CUSTOM DATES</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="border-[3px] border-mm-black bg-mm-bone p-3">
              <p className="font-sans text-[12px] font-bold text-mm-black">Travelling solo?</p>
              <p className="mt-1 text-sm leading-snug text-mm-black/75">
                Pick any {weekdayName ?? "start"}{weekdayName ? "" : " day"} you like. Solo trips are guaranteed to run,
                so your date is yours.
              </p>
              <button
                onClick={onBook}
                className="mt-3 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
              >
                BOOK NOW <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="border-[3px] border-mm-black bg-mm-bone p-3">
              <p className="font-sans text-[12px] font-bold text-mm-black">Got a squad?</p>
              <p className="mt-1 text-sm leading-snug text-mm-black/75">
                We can open a date just for your crew. Tell us when you want to go and we'll set it up.
              </p>
              <a
                href={`mailto:${CUSTOM_DATES_EMAIL}?subject=${encodeURIComponent(`Custom date request — ${trip.name}`)}`}
                className="mt-3 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-lime px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
              >
                REQUEST TO BOOK <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
