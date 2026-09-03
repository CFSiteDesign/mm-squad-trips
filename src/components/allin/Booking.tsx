// The booking section on every ALL IN trip page.
//
// One white panel, no anchor jumps: picking a date opens the form inline
// underneath it. The soonest departure is promoted to its own card so booking
// it is a single click. There is no custom-date picker; people who need
// something else reach an advisor.
//
// The form and its rules live in useCheckout() + CheckoutPanel, shared with
// the advisor checkout page, so the deposit rule, code validation and
// analytics can't drift between the two.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, AlertCircle, ChevronDown, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, paymentLine } from "@/lib/trip-helpers";
import { dayLabel, endDate, monthKey, monthLabel } from "@/lib/trip-dates";
import { nextDeparture } from "@/lib/departures";
import { useCheckout, MAX_SPOTS } from "@/lib/use-checkout";
import { CheckoutPanel } from "@/components/allin/CheckoutPanel";
import { submitAdvisorEnquiry, validateContact, type ContactMethod } from "@/lib/advisor";
import type { Trip, Departure } from "@/types/trip";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Booking({ trip }: { trip: Trip }) {
  const [chosen, setChosen] = useState<Departure | null>(null);
  const checkout = useCheckout(trip, chosen);

  const departures = useMemo(() => {
    const known = new Set(trip.departures.map((d) => d.id));
    return [...trip.departures, ...checkout.revealed.filter((d) => !known.has(d.id))]
      .filter((d) => !d.isPrivate || checkout.revealed.some((r) => r.id === d.id))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trip.departures, checkout.revealed]);
  const next = useMemo(() => nextDeparture(departures), [departures]);

  const months = useMemo(() => {
    const seen: string[] = [];
    for (const d of departures) if (!seen.includes(monthKey(d.date))) seen.push(monthKey(d.date));
    return seen;
  }, [departures]);

  const [month, setMonth] = useState("");
  const activeMonth = months.includes(month) ? month : months[0] ?? "";
  const advisorRef = useRef<HTMLDivElement>(null);
  const oneClickApplied = useRef(false);

  // The next departure has its own card, so it is not repeated in the list.
  const rows = departures.filter((d) => monthKey(d.date) === activeMonth && d.id !== next?.id);
  const weekday = trip.startWeekday === null || trip.startWeekday === undefined ? null : Number(trip.startWeekday);
  const weekdayName = weekday === null ? null : WEEKDAYS[weekday];

  // One-click booking links generated in admin:
  //   /{slug}?date=YYYY-MM-DD&spots=2&code=XYZ#booking
  // Only ever preselects a departure that is already listed.
  useEffect(() => {
    if (oneClickApplied.current || departures.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const qDate = params.get("date");
    const qSpots = Number(params.get("spots") || "0");
    const qCode = params.get("code");
    if (!qDate && !qSpots && !qCode) return;
    oneClickApplied.current = true;

    if (qSpots >= 1 && qSpots <= MAX_SPOTS) checkout.setSpots(qSpots);
    // A link's code can be either kind; validation sorts out which.
    if (qCode) checkout.setField("discountCode", qCode.toUpperCase());
    if (qDate) {
      const match = departures.find((d) => d.date === qDate);
      if (match) {
        setMonth(monthKey(match.date));
        setChosen(match);
        // Retry the jump: the page is still loading images, so a single scroll
        // lands in the wrong place or is undone by ScrollToTop.
        let tries = 0;
        const jump = window.setInterval(() => {
          const el = document.getElementById("booking");
          tries += 1;
          if (el) {
            const top = el.getBoundingClientRect().top;
            if (Math.abs(top) < 120) { window.clearInterval(jump); return; }
            window.scrollTo({ top: top + window.scrollY - 8, behavior: tries === 1 ? "smooth" : "auto" });
          }
          if (tries >= 12) window.clearInterval(jump);
        }, 300);
      } else {
        toast.error("That departure date isn't available any more — pick another below.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departures]);

  const toAdvisor = () => advisorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const DateRow = ({ d }: { d: Departure }) => {
    const soldOut = !d.bookable || d.spotsRemaining <= 0;
    const open = chosen?.id === d.id;
    const pay = paymentLine(d.date, 1, d.price);
    return (
      <div className="border-[3px] border-mm-black bg-mm-bone">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="min-w-[104px]">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/50">Start date</p>
            <p className="font-display text-lg leading-none text-mm-black">{dayLabel(d.date)}</p>
          </div>
          <div className="min-w-[104px]">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/50">End date</p>
            <p className="font-display text-lg leading-none text-mm-black">{dayLabel(endDate(d.date, trip.days))}</p>
          </div>
          <div className="flex min-w-[128px] items-center gap-1.5 text-sm">
            {soldOut
              ? <><AlertCircle className="h-4 w-4 text-mm-orange" /> <span className="text-mm-black/70">Sold out</span></>
              : <><Check className="h-4 w-4 text-mm-black" strokeWidth={3} /> <span className="text-mm-black/80">{d.spotsRemaining} available{d.isPrivate ? " · your squad's date" : ""}</span></>}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              {d.strikethrough && d.strikethrough > d.price && (
                <span className="mr-2 text-xs text-mm-black/45 line-through">{formatPrice(d.strikethrough)}</span>
              )}
              <span className="font-display text-lg text-mm-black">{formatPrice(d.price)}</span>
              <span className="text-xs text-mm-black/60">/person</span>
              {pay.type === "full" && <span className="block text-[10px] text-mm-black/55">pay in full</span>}
            </div>
            <button
              onClick={() => (soldOut ? toAdvisor() : setChosen(open ? null : d))}
              className="flex items-center gap-1.5 border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
            >
              {open ? "CLOSE" : soldOut ? "WAITLIST" : "BOOK NOW"}
              {!soldOut && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
            </button>
          </div>
        </div>
        {open && chosen && <CheckoutPanel trip={trip} departure={chosen} checkout={checkout} />}
      </div>
    );
  };

  return (
    <div className="border-[3px] border-mm-black bg-mm-bone">
      {/* Solo + squad, stacked */}
      <div className="space-y-3 border-b-[3px] border-mm-black p-4 md:p-6">
        <div className="border-[3px] border-mm-black bg-mm-lime p-4">
          <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">✔ SOLO TRAVELLER? YOU'RE COVERED</p>
          <p className="mt-2 text-sm leading-snug text-mm-black/80">
            Lock in your spot with total peace of mind. Easy single booking, 100% departure rate,
            and zero fuss. Just show up and experience all the best bits.
          </p>
        </div>
        <div className="border-[3px] border-mm-black bg-mm-cyan p-4">
          <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">✔ BRING YOUR SQUAD (AND GO FOR FREE)</p>
          <p className="mt-2 text-sm leading-snug text-mm-black/80">{SQUAD_BENEFITS.free.body}</p>
        </div>
      </div>

      {/* The next departure, promoted so booking it is one click. */}
      {next ? (
        <div className="border-b-[3px] border-mm-black p-4 md:p-6">
          <div className="border-[3px] border-mm-black bg-mm-yellow">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
              <div>
                <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">★ NEXT DEPARTURE</p>
                <p className="mt-1 font-display text-3xl leading-none text-mm-black">{dayLabel(next.date)}</p>
                <p className="mt-1.5 text-sm text-mm-black/75">
                  Back {dayLabel(endDate(next.date, trip.days))} · {next.spotsRemaining} spot{next.spotsRemaining === 1 ? "" : "s"} left
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="text-right">
                  {next.strikethrough && next.strikethrough > next.price && (
                    <span className="mr-2 text-xs text-mm-black/45 line-through">{formatPrice(next.strikethrough)}</span>
                  )}
                  <span className="font-display text-2xl text-mm-black">{formatPrice(next.price)}</span>
                  <span className="text-xs text-mm-black/60">/person</span>
                </div>
                <button
                  onClick={() => setChosen(chosen?.id === next.id ? null : next)}
                  className="flex items-center gap-1.5 border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-sticker text-[11px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
                >
                  {chosen?.id === next.id ? "CLOSE" : "BOOK THIS ONE"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${chosen?.id === next.id ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
            {chosen?.id === next.id && <CheckoutPanel trip={trip} departure={next} checkout={checkout} />}
          </div>
          <p className="mt-2 text-[12px] text-mm-black/60">
            {weekdayName ? `Departs every ${weekdayName} — pick any week below.` : "Pick any week below."}
          </p>
        </div>
      ) : (
        <div className="border-b-[3px] border-mm-black p-4 md:p-6">
          <p className="text-sm text-mm-black/70">No dates are open for booking right now — leave your details below and an advisor will sort you out.</p>
        </div>
      )}

      {/* Month toggles */}
      {months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b-[3px] border-mm-black p-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => { setMonth(m); setChosen(null); }}
              className={`whitespace-nowrap border-[3px] border-mm-black px-3 py-1.5 font-sans text-[12px] font-bold transition-colors ${
                activeMonth === m ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black hover:bg-mm-yellow"
              }`}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
      )}

      {/* Every other week. Choosing one opens the form directly underneath it. */}
      <div className="space-y-2 p-4 md:p-6">
        {rows.map((d) => <DateRow key={d.id} d={d} />)}
        {rows.length === 0 && next && (
          <p className="py-2 text-sm text-mm-black/60">
            The next departure above is the only one left this month.
          </p>
        )}

        <div ref={advisorRef}>
          <AdvisorBox trip={trip} />
        </div>
      </div>
    </div>
  );
}

/**
 * Replaces the custom-date picker. One way to reach a human: a WhatsApp
 * number or an email, nothing else, into the same database as the bookings.
 */
function AdvisorBox({ trip }: { trip: Trip }) {
  const [method, setMethod] = useState<ContactMethod>("whatsapp");
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    const problem = validateContact(method, value);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSending(true);
    try {
      await submitAdvisorEnquiry({ tripSlug: trip.slug, tripName: trip.name, method, value });
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send that just now");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 border-[3px] border-mm-black bg-mm-cyan p-4">
      <p className="font-sticker text-[11px] tracking-[0.14em] text-mm-black">✳ WANT TO TALK IT THROUGH?</p>
      <p className="mt-2 max-w-xl text-sm leading-snug text-mm-black/80">
        Leave a WhatsApp number or an email and one of our advisors will get back to you about
        dates, group bookings and anything else on your mind.
      </p>

      {sent ? (
        <div className="mt-3 flex items-center gap-2 border-[3px] border-mm-black bg-mm-lime px-4 py-3">
          <Check className="h-4 w-4 text-mm-black" strokeWidth={3} />
          <p className="text-sm font-bold text-mm-black">Got it — an advisor will be in touch.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          <div className="flex">
            {([["whatsapp", "WHATSAPP", MessageCircle], ["email", "EMAIL", Mail]] as const).map(
              ([m, label, Icon], i) => (
                <button
                  key={m}
                  onClick={() => { setMethod(m); setValue(""); }}
                  className={`flex items-center gap-1.5 border-[3px] border-mm-black px-3 py-2 font-sticker text-[10px] tracking-[0.12em] transition-colors ${i === 1 ? "border-l-0" : ""} ${
                    method === m ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black hover:bg-mm-yellow"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ),
            )}
          </div>
          <input
            type={method === "email" ? "email" : "tel"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder={method === "email" ? "you@email.com" : "+44 7700 900000"}
            aria-label={method === "email" ? "Your email" : "Your WhatsApp number"}
            className="min-w-[200px] flex-1 border-[3px] border-mm-black bg-mm-bone px-3 py-2 text-sm text-mm-black outline-none focus:bg-mm-yellow/20"
          />
          <button
            onClick={send}
            disabled={sending}
            className="flex items-center gap-2 border-[3px] border-mm-black bg-mm-lime px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {sending ? "SENDING…" : "TALK TO AN ADVISOR"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
