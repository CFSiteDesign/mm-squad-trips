// The checkout form itself: spots, details, codes, summary, pay button.
// Pure rendering over useCheckout(); the parent decides which departure it's
// for and where it sits on the page.
import { ArrowRight } from "lucide-react";
import { formatPrice, paymentLine } from "@/lib/trip-helpers";
import { dayLabel, endDate } from "@/lib/trip-dates";
import { MAX_SPOTS, type Checkout, type CheckoutFields, type CodeStatus } from "@/lib/use-checkout";
import type { Trip, Departure } from "@/types/trip";

export function CheckoutPanel({ trip, departure, checkout }: { trip: Trip; departure: Departure; checkout: Checkout }) {
  const { form, setField, spots, setSpots, submitting, codesPending, squadStatus, discountStatus, discountAmount, appliedDiscount, submit } = checkout;

  const pay = paymentLine(departure.date, spots, departure.price);
  const total = departure.price * spots;
  const due = Math.max(0, total - discountAmount);
  const today = pay.type === "deposit" ? pay.amount : due;
  const balance = pay.type === "deposit" ? Math.max(0, due - pay.amount) : 0;

  const field = (k: "firstName" | "lastName" | "email" | "phone", label: string, type = "text", placeholder = "") => (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/55">{label}</span>
      <input
        type={type}
        value={form[k]}
        placeholder={placeholder}
        autoComplete={k === "email" ? "email" : k === "phone" ? "tel" : k === "firstName" ? "given-name" : "family-name"}
        onChange={(e) => setField(k, e.target.value)}
        className="mt-1 w-full border-[3px] border-mm-black bg-mm-bone px-3 py-2 text-sm text-mm-black outline-none focus:bg-mm-yellow/20"
      />
    </label>
  );

  const codeField = (k: keyof Pick<CheckoutFields, "squadCode" | "discountCode" | "secondCode">, label: string, status: CodeStatus | null) => (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-mm-black/55">{label}</span>
      <input
        type="text"
        value={form[k]}
        autoCapitalize="characters"
        onChange={(e) => setField(k, e.target.value.toUpperCase())}
        className="mt-1 w-full border-[3px] border-mm-black bg-mm-bone px-3 py-2 font-display text-sm uppercase tracking-wide text-mm-black outline-none focus:bg-mm-yellow/20"
      />
      {status && form[k].trim() && (
        <span className={`mt-1 block text-[11px] leading-snug ${status.valid ? "font-bold text-mm-black" : "text-mm-pink"}`}>{status.msg}</span>
      )}
    </label>
  );

  return (
    <div className="border-t-[3px] border-mm-black bg-mm-bone p-4 md:p-5">
      {/* 1 — spots */}
      <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black">1 · HOW MANY SPOTS?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: MAX_SPOTS }, (_, i) => i + 1).map((n) => {
          const available = n <= departure.spotsRemaining;
          return (
            <button
              key={n}
              onClick={() => available && setSpots(n)}
              disabled={!available}
              title={available ? undefined : `Only ${departure.spotsRemaining} left on this date`}
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
          departing <strong className="text-mm-black">{dayLabel(departure.date)}</strong>
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
          {dayLabel(departure.date)} → {dayLabel(endDate(departure.date, trip.days))} · {spots} spot{spots === 1 ? "" : "s"}
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
          disabled={submitting || codesPending}
          className="mt-4 flex w-full items-center justify-center gap-2 border-[3px] border-mm-black bg-mm-pink px-5 py-3.5 font-sticker text-xs tracking-[0.14em] text-mm-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? "STARTING CHECKOUT…" : codesPending ? "CHECKING YOUR CODE…" : "CONTINUE TO PAYMENT"} <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-2 text-center text-[11px] text-mm-black/55">Secure Stripe checkout · spot held on payment</p>
      </div>
    </div>
  );
}
