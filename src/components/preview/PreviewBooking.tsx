// One white booking section for the Aug 2026 preview.
//
// Per the 25 Aug tweaks: no pink panel, no anchor jumps, no repeated blocks.
// Picking a date opens the form inline underneath that date, so the whole
// checkout happens in one place.
//
// Kyle's Sep review: departures run every week on the trip's agreed day and the
// next one is promoted to the top so it takes a single click; the custom-date
// picker is gone, replaced by an advisor callback that only asks for a
// WhatsApp number or an email.
import { useMemo, useState } from "react";
import { ArrowRight, Check, AlertCircle, ChevronDown, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/trip-helpers";
import { createCheckoutSession } from "@/lib/api";
import { previewDepartures, nextDeparture, type PreviewDeparture } from "@/data/preview-departures";
import { submitAdvisorEnquiry, validateContact, type ContactMethod } from "@/lib/preview-advisor";
import type { Trip } from "@/types/trip";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";

const DEPOSIT_PER_SPOT = 99;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (k: string) =>
  new Date(k + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function endDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.max(0, days - 1));
  return d.toISOString().slice(0, 10);
}

/** The row being booked. `departureId` is null for a week the preview filled
 *  in, which checks out as a custom date instead. */
type Chosen = { key: string; departureId: string | null; date: string; price: number };

const chosenFrom = (d: PreviewDeparture): Chosen => ({
  key: d.id,
  departureId: d.generated ? null : d.id,
  date: d.date,
  price: d.price,
});

export function PreviewBooking({ trip }: { trip: Trip }) {
  const departures = useMemo(() => previewDepartures(trip), [trip]);
  const next = useMemo(() => nextDeparture(departures), [departures]);

  const months = useMemo(() => {
    const seen: string[] = [];
    for (const d of departures) if (!seen.includes(monthKey(d.date))) seen.push(monthKey(d.date));
    return seen;
  }, [departures]);

  const [month, setMonth] = useState(months[0] ?? "");
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [spots, setSpots] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", squadCode: "", discountCode: "",
  });

  // The next departure gets its own card at the top, so it is not repeated in
  // the month list below.
  const rows = departures.filter(
    (d) => monthKey(d.date) === (month || months[0]) && d.id !== next?.id,
  );
  const weekday = trip.startWeekday === null || trip.startWeekday === undefined ? null : Number(trip.startWeekday);
  const weekdayName = weekday === null ? null : WEEKDAYS[weekday];
  const basePrice = chosen?.price ?? 0;

  async function submit() {
    if (!chosen) return;
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast.error("Fill in your name, email and phone");
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await createCheckoutSession({
        tripSlug: trip.slug,
        ...(chosen.departureId ? { departureId: chosen.departureId } : { customDate: chosen.date }),
        groupSize: spots,
        leadBooker: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone,
        },
        travelers: [],
        discountCode: (form.squadCode || form.discountCode).trim().toUpperCase() || undefined,
        secondDiscountCode:
          form.squadCode && form.discountCode ? form.discountCode.trim().toUpperCase() : undefined,
      } as Parameters<typeof createCheckoutSession>[0]);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  }

  const field = (k: keyof typeof form, label: string, type = "text") => (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/55">{label}</span>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-1 w-full border-[3px] border-mm-black bg-mm-bone px-3 py-2 text-sm text-mm-black outline-none focus:bg-mm-yellow/20"
      />
    </label>
  );

  const Panel = () =>
    !chosen ? null : (
      <div className="border-t-[3px] border-mm-black bg-mm-bone p-4 md:p-5">
        {/* 1 — spots */}
        <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">1 · HOW MANY SPOTS?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSpots(n)}
              className={`h-10 w-10 border-[3px] border-mm-black font-display text-lg transition-colors ${
                spots === n ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black hover:bg-mm-yellow"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="self-center pl-2 text-sm text-mm-black/70">
            departing <strong className="text-mm-black">{dayLabel(chosen.date)}</strong>
          </span>
        </div>

        {/* 2 — details, two columns */}
        <p className="mt-6 font-sticker text-[10px] tracking-[0.14em] text-mm-black">2 · YOUR DETAILS</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {field("firstName", "First name")}
          {field("lastName", "Second name")}
          {field("email", "Email", "email")}
          {field("phone", "Phone", "tel")}
          {field("squadCode", "Squad code (optional)")}
          {field("discountCode", "Discount code (optional)")}
        </div>

        {/* 3 — summary */}
        <p className="mt-6 font-sticker text-[10px] tracking-[0.14em] text-mm-black">3 · YOU'RE ABOUT TO BOOK</p>
        <div className="mt-2 border-[3px] border-mm-black bg-mm-paper p-4">
          <p className="font-display text-lg leading-tight text-mm-black">
            {trip.name} · {trip.days} days
          </p>
          <p className="mt-1 text-sm text-mm-black/70">
            {dayLabel(chosen.date)} → {dayLabel(endDate(chosen.date, trip.days))} · {spots} spot{spots === 1 ? "" : "s"}
          </p>
          <dl className="mt-3 space-y-1 border-t-[2px] border-mm-black/15 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-mm-black/70">Trip total</dt><dd className="text-mm-black">{formatPrice(basePrice * spots)}</dd></div>
            <div className="flex justify-between font-bold"><dt className="text-mm-black">Deposit today</dt><dd className="text-mm-black">{formatPrice(DEPOSIT_PER_SPOT * spots)}</dd></div>
            <div className="flex justify-between"><dt className="text-mm-black/70">Balance, auto-charged 7 days before</dt><dd className="text-mm-black">{formatPrice(Math.max(0, basePrice * spots - DEPOSIT_PER_SPOT * spots))}</dd></div>
          </dl>
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 border-[3px] border-mm-black bg-mm-pink px-5 py-3.5 font-sticker text-xs tracking-[0.14em] text-mm-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? "STARTING CHECKOUT…" : "CONTINUE TO PAYMENT"} <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2 text-center text-[11px] text-mm-black/55">Secure Stripe checkout · spot held on payment</p>
        </div>
      </div>
    );

  const DateRow = ({ d }: { d: PreviewDeparture }) => {
    const soldOut = !d.bookable || d.spotsRemaining <= 0;
    const open = chosen?.key === d.id;
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
              ? <><AlertCircle className="h-4 w-4 text-mm-orange" /> <span className="text-mm-black/70">Waitlist</span></>
              : <><Check className="h-4 w-4 text-mm-black" strokeWidth={3} /> <span className="text-mm-black/80">{d.spotsRemaining} available</span></>}
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
              onClick={() => setChosen(open ? null : chosenFrom(d))}
              className="flex items-center gap-1.5 border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
            >
              {open ? "CLOSE" : soldOut ? "REQUEST" : "BOOK NOW"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {open && <Panel />}
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
      {next && (
        <div className="border-b-[3px] border-mm-black p-4 md:p-6">
          <div className="border-[3px] border-mm-black bg-mm-yellow">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
              <div>
                <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">★ NEXT DEPARTURE</p>
                <p className="mt-1 font-display text-3xl leading-none text-mm-black">{dayLabel(next.date)}</p>
                <p className="mt-1.5 text-sm text-mm-black/75">
                  Back {dayLabel(endDate(next.date, trip.days))} · {next.spotsRemaining} spots left
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
                  onClick={() => setChosen(chosen?.key === next.id ? null : chosenFrom(next))}
                  className="flex items-center gap-1.5 border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-sticker text-[11px] tracking-[0.12em] text-mm-black transition-transform hover:-translate-y-0.5"
                >
                  {chosen?.key === next.id ? "CLOSE" : "BOOK THIS ONE"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${chosen?.key === next.id ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
            {chosen?.key === next.id && <Panel />}
          </div>
          <p className="mt-2 text-[12px] text-mm-black/60">
            {weekdayName ? `Departs every ${weekdayName} — pick any week below.` : "Pick any week below."}
          </p>
        </div>
      )}

      {/* Month toggles */}
      <div className="flex gap-2 overflow-x-auto border-b-[3px] border-mm-black p-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => { setMonth(m); setChosen(null); }}
            className={`whitespace-nowrap border-[3px] border-mm-black px-3 py-1.5 font-sans text-[12px] font-bold transition-colors ${
              (month || months[0]) === m ? "bg-mm-pink text-mm-bone" : "bg-mm-bone text-mm-black hover:bg-mm-yellow"
            }`}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      {/* Every other week. Choosing one opens the form directly underneath it. */}
      <div className="space-y-2 p-4 md:p-6">
        {rows.map((d) => <DateRow key={d.id} d={d} />)}
        {rows.length === 0 && (
          <p className="py-2 text-sm text-mm-black/60">
            The next departure above is the only one left this month.
          </p>
        )}

        <AdvisorBox trip={trip} />
      </div>
    </div>
  );
}

/**
 * Replaces the custom-date picker. Kyle wanted one way to reach a human that
 * asks for a WhatsApp number or an email and nothing else, landing in the same
 * database as the bookings.
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
