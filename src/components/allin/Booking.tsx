// The booking section on every ALL IN trip page.
//
// One white panel, no anchor jumps: picking a date opens the form inline
// underneath it. Departures run every week on the trip's start day and the
// soonest is promoted to its own card, so booking it is a single click. There
// is no custom-date picker; people who need something else reach an advisor.
//
// Payment rules are the live ones, shared with the server and the student
// flow in BookingFlow.tsx: $99 a spot holds a departure 7+ days out, otherwise
// it's pay in full; discount and squad codes are validated server-side before
// the summary shows a price; a 1-spot booking is a solo booking, which is
// guaranteed to run.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, AlertCircle, ChevronDown, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, paymentLine } from "@/lib/trip-helpers";
import { createCheckoutSession, validateDiscount, fetchTrip } from "@/lib/api";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import { readGaClientId, readUtm } from "@/lib/ga";
import { nextDeparture } from "@/lib/departures";
import { submitAdvisorEnquiry, validateContact, type ContactMethod } from "@/lib/advisor";
import type { Trip, Departure } from "@/types/trip";
import { SQUAD_BENEFITS } from "@/data/squad-benefits";

const MAX_SPOTS = 5;
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

type CodeStatus = { valid: boolean; msg: string; amount: number; kind?: string; stackable?: boolean };

export function Booking({ trip }: { trip: Trip }) {
  // Private departures owned by an entered squad code: invisible to the public,
  // revealed to anyone holding the code so a leader's crew can book their date.
  const [revealed, setRevealed] = useState<Departure[]>([]);
  const departures = useMemo(() => {
    const known = new Set(trip.departures.map((d) => d.id));
    return [...trip.departures, ...revealed.filter((d) => !known.has(d.id))]
      .filter((d) => !d.isPrivate || revealed.some((r) => r.id === d.id))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trip.departures, revealed]);
  const next = useMemo(() => nextDeparture(departures), [departures]);

  const months = useMemo(() => {
    const seen: string[] = [];
    for (const d of departures) if (!seen.includes(monthKey(d.date))) seen.push(monthKey(d.date));
    return seen;
  }, [departures]);

  const [month, setMonth] = useState("");
  const activeMonth = months.includes(month) ? month : months[0] ?? "";
  const [chosen, setChosen] = useState<Departure | null>(null);
  const [spots, setSpots] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", squadCode: "", discountCode: "", secondCode: "",
  });
  const [squadStatus, setSquadStatus] = useState<CodeStatus | null>(null);
  const [discountStatus, setDiscountStatus] = useState<CodeStatus | null>(null);
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

    if (qSpots >= 1 && qSpots <= MAX_SPOTS) setSpots(qSpots);
    // A link's code can be either kind; validation below sorts out which.
    if (qCode) setForm((f) => ({ ...f, discountCode: qCode.toUpperCase() }));
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
  }, [departures]);

  // Spots can't exceed what the chosen departure has left.
  useEffect(() => {
    if (chosen && spots > chosen.spotsRemaining) setSpots(Math.max(1, chosen.spotsRemaining));
  }, [chosen, spots]);

  /* ---- code validation, server-side like the live flow ---- */
  const subtotal = (chosen?.price ?? trip.defaultPrice) * spots;

  // Squad code: must resolve to a squad leader. A discount code typed here is
  // moved across to the discount field rather than rejected.
  useEffect(() => {
    const code = form.squadCode.trim().toUpperCase();
    if (!code) { setSquadStatus(null); setRevealed([]); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      validateDiscount({ code, tripSlug: trip.slug, amount: subtotal, departureDate: chosen?.date }).then((r) => {
        if (cancelled) return;
        if (r.valid && r.kind === "squad") {
          setSquadStatus({ valid: true, msg: "Squad code applied ✓", amount: 0, kind: "squad" });
          fetchTrip(trip.slug, code)
            .then((tr) => { if (!cancelled) setRevealed((tr.departures ?? []).filter((d) => d.isPrivate)); })
            .catch(() => { /* reveal is best-effort — public dates still work */ });
        } else if (r.valid) {
          setSquadStatus({ valid: false, msg: "That's a discount code — moved it to the discount box", amount: 0 });
          setForm((f) => ({ ...f, squadCode: "", discountCode: f.discountCode || code }));
        } else {
          setSquadStatus({ valid: false, msg: r.reason || "Squad code not found", amount: 0 });
          setRevealed([]);
        }
      });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [form.squadCode, trip.slug, subtotal, chosen?.date]);

  // Discount code (+ optional second stackable code). A squad code typed here
  // is moved across to the squad field.
  useEffect(() => {
    const code = form.discountCode.trim().toUpperCase();
    const code2 = form.secondCode.trim().toUpperCase();
    if (!code) { setDiscountStatus(null); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      validateDiscount({ code, secondCode: code2 || undefined, tripSlug: trip.slug, amount: subtotal, departureDate: chosen?.date }).then((r) => {
        if (cancelled) return;
        if (r.valid && r.kind === "squad") {
          setDiscountStatus(null);
          setForm((f) => ({ ...f, discountCode: "", squadCode: f.squadCode || code }));
        } else if (r.valid && r.isCreator) {
          const off = r.discountAmount ?? 0;
          setDiscountStatus({
            valid: true, amount: off, stackable: false,
            msg: off > 0
              ? `Creator code applied — ${formatPrice(off)} off, you're in the prize draw, and 2 free nights go to your Mad Monkey Loyalty account`
              : "Creator code applied — you're in the prize draw, and 2 free nights go to your Mad Monkey Loyalty account",
          });
        } else if (r.valid && r.stackFixed != null && r.stackPercent != null) {
          setDiscountStatus({
            valid: true, amount: r.discountAmount ?? 0, stackable: true,
            msg: `Applied — ${formatPrice(r.stackFixed)} off, then ${r.stackPercent}% off the rest: ${formatPrice(r.discountAmount ?? 0)} total${r.capped ? " (max discount reached)" : ""}`,
          });
        } else if (r.valid) {
          setDiscountStatus({
            valid: true, amount: r.discountAmount ?? 0, stackable: r.stackable === true,
            msg: `Applied — ${formatPrice(r.discountAmount ?? 0)} off${r.capped ? " (max discount reached)" : ""}`,
          });
        } else {
          setDiscountStatus({ valid: false, msg: r.reason || "Code not found", amount: 0 });
        }
      });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [form.discountCode, form.secondCode, trip.slug, subtotal, chosen?.date]);

  const discountAmount = discountStatus?.valid ? discountStatus.amount : 0;
  const appliedDiscount = discountStatus?.valid ? form.discountCode.trim().toUpperCase() : "";
  const appliedSquad = squadStatus?.valid ? form.squadCode.trim().toUpperCase() : "";

  async function submit() {
    if (!chosen) return;
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast.error("Fill in your name, email and phone");
      return;
    }
    if (form.squadCode.trim() && !squadStatus?.valid) {
      toast.error("That squad code isn't recognised — clear it or check it");
      return;
    }
    if (form.discountCode.trim() && !discountStatus?.valid) {
      toast.error("That discount code isn't valid — clear it or check it");
      return;
    }
    setSubmitting(true);

    if (markCheckoutEventOnce("begin_checkout", `${trip.slug}:${chosen.id}:${spots}`)) {
      gtmClearEcommerce();
      gtmPushEvent("begin_checkout", {
        conversion_type: CONVERSION_TYPE_ALL_IN,
        ecommerce: {
          currency: "USD",
          value: chosen.price * spots - discountAmount,
          coupon: appliedDiscount,
          items: [buildTripEcommerceItem(trip, chosen, { quantity: spots, coupon: appliedDiscount || undefined, discount: discountAmount })],
        },
      });
    }

    try {
      const { url } = await createCheckoutSession({
        tripSlug: trip.slug,
        departureId: chosen.id,
        groupSize: spots,
        leadBooker: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          // One spot is a solo booking: guaranteed to run, never cancelled for
          // numbers. That is the promise on the page, so it is the flag we send.
          solo: spots === 1,
        },
        travelers: [],
        // The server only ever applied one code before squadCode existed, so a
        // squad code still travels in discountCode when it is the only one.
        discountCode: appliedDiscount || appliedSquad || undefined,
        secondDiscountCode: appliedDiscount && form.secondCode.trim() ? form.secondCode.trim().toUpperCase() : undefined,
        squadCode: appliedSquad || undefined,
        utm: readUtm(),
        gaClientId: readGaClientId(),
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  }

  const field = (k: "firstName" | "lastName" | "email" | "phone", label: string, type = "text", placeholder = "") => (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/55">{label}</span>
      <input
        type={type}
        value={form[k]}
        placeholder={placeholder}
        autoComplete={k === "email" ? "email" : k === "phone" ? "tel" : k === "firstName" ? "given-name" : "family-name"}
        onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, [k]: v })); }}
        className="mt-1 w-full border-[3px] border-mm-black bg-mm-bone px-3 py-2 text-sm text-mm-black outline-none focus:bg-mm-yellow/20"
      />
    </label>
  );

  const codeField = (k: "squadCode" | "discountCode" | "secondCode", label: string, status: CodeStatus | null) => (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/55">{label}</span>
      <input
        type="text"
        value={form[k]}
        autoCapitalize="characters"
        onChange={(e) => { const v = e.target.value.toUpperCase(); setForm((f) => ({ ...f, [k]: v })); }}
        className="mt-1 w-full border-[3px] border-mm-black bg-mm-bone px-3 py-2 font-display text-sm uppercase tracking-wide text-mm-black outline-none focus:bg-mm-yellow/20"
      />
      {status && form[k].trim() && (
        <span className={`mt-1 block text-[11px] leading-snug ${status.valid ? "font-bold text-mm-black" : "text-mm-pink"}`}>{status.msg}</span>
      )}
    </label>
  );

  const Panel = () => {
    if (!chosen) return null;
    const pay = paymentLine(chosen.date, spots, chosen.price);
    const total = chosen.price * spots;
    const due = Math.max(0, total - discountAmount);
    const today = pay.type === "deposit" ? pay.amount : due;
    const balance = pay.type === "deposit" ? Math.max(0, due - pay.amount) : 0;
    return (
      <div className="border-t-[3px] border-mm-black bg-mm-bone p-4 md:p-5">
        {/* 1 — spots */}
        <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">1 · HOW MANY SPOTS?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: MAX_SPOTS }, (_, i) => i + 1).map((n) => {
            const available = n <= chosen.spotsRemaining;
            return (
              <button
                key={n}
                onClick={() => available && setSpots(n)}
                disabled={!available}
                title={available ? undefined : `Only ${chosen.spotsRemaining} left on this date`}
                className={`h-10 w-10 border-[3px] border-mm-black font-display text-lg transition-colors ${
                  spots === n ? "bg-mm-pink text-mm-bone"
                    : available ? "bg-mm-bone text-mm-black hover:bg-mm-yellow"
                    : "cursor-not-allowed bg-mm-bone text-mm-black/25"
                }`}
              >
                {n}
              </button>
            );
          })}
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
          {field("phone", "Phone (with country code)", "tel", "+44 7700 900000")}
          {codeField("squadCode", "Squad code (optional)", squadStatus)}
          {codeField("discountCode", "Discount code (optional)", discountStatus)}
          {discountStatus?.valid && (discountStatus.stackable || form.secondCode) && (
            <div className="sm:col-start-2">{codeField("secondCode", "Second code (optional)", null)}</div>
          )}
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
            <div className="flex justify-between"><dt className="text-mm-black/70">Trip total</dt><dd className="text-mm-black">{formatPrice(total)}</dd></div>
            {discountAmount > 0 && (
              <div className="flex justify-between"><dt className="text-mm-black/70">Discount {appliedDiscount}</dt><dd className="text-mm-black">− {formatPrice(discountAmount)}</dd></div>
            )}
            <div className="flex justify-between font-bold">
              <dt className="text-mm-black">{pay.type === "deposit" ? "Deposit today" : "Pay in full today"}</dt>
              <dd className="text-mm-black">{formatPrice(today)}</dd>
            </div>
            {pay.type === "deposit" && (
              <div className="flex justify-between"><dt className="text-mm-black/70">Balance, auto-charged 7 days before</dt><dd className="text-mm-black">{formatPrice(balance)}</dd></div>
            )}
          </dl>
          {pay.type === "full" && (
            <p className="mt-2 text-[11px] text-mm-black/60">Departures inside 7 days are paid in full — the deposit option isn't available this close to the date.</p>
          )}
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
  };

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
            {chosen?.id === next.id && <Panel />}
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
