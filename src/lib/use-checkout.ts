// The state behind the ALL IN checkout form: who's booking, how many spots,
// which codes, and the hand-off to Stripe.
//
// One hook, used by the booking section on the trip page and by the advisor
// checkout page, so the deposit rule, code validation, solo flag and analytics
// events cannot drift between the two. The parent owns which departure is
// chosen; this owns everything typed into the form.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/trip-helpers";
import { createCheckoutSession, validateDiscount, fetchTrip } from "@/lib/api";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import { readGaClientId, readUtm } from "@/lib/ga";
import type { Trip, Departure } from "@/types/trip";

export const MAX_SPOTS = 5;

/** Adventure Advisors link token: opaque, case-sensitive, their format. */
export const ADVISOR_REF_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export type CheckoutFields = {
  firstName: string; lastName: string; email: string; phone: string;
  squadCode: string; discountCode: string; secondCode: string;
};

export type CodeStatus = { valid: boolean; msg: string; amount: number; kind?: string; stackable?: boolean };

const EMPTY: CheckoutFields = {
  firstName: "", lastName: "", email: "", phone: "", squadCode: "", discountCode: "", secondCode: "",
};

const clampSpots = (n: number) => Math.min(MAX_SPOTS, Math.max(1, Math.round(n) || 1));

export interface UseCheckoutOptions {
  /** Prefill, e.g. from an advisor link. Applied once, on mount. */
  initial?: Partial<CheckoutFields>;
  initialSpots?: number;
  /** Adventure Advisors token, carried into the Stripe metadata untouched. */
  advisorRef?: string;
  /** Captured at page load when the URL is going to be cleaned afterwards. */
  utm?: Record<string, string>;
}

export function useCheckout(trip: Trip, departure: Departure | null, opts: UseCheckoutOptions = {}) {
  const [form, setForm] = useState<CheckoutFields>(() => ({ ...EMPTY, ...opts.initial }));
  const [spots, setSpots] = useState(() => clampSpots(opts.initialSpots ?? 1));
  const [submitting, setSubmitting] = useState(false);
  const [squadStatus, setSquadStatus] = useState<CodeStatus | null>(null);
  const [discountStatus, setDiscountStatus] = useState<CodeStatus | null>(null);
  // Private departures owned by an entered squad code: invisible to the public,
  // revealed to anyone holding the code so a leader's crew can book their date.
  const [revealed, setRevealed] = useState<Departure[]>([]);

  const setField = <K extends keyof CheckoutFields>(k: K, v: CheckoutFields[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Spots can't exceed what the chosen departure has left.
  useEffect(() => {
    if (departure && spots > departure.spotsRemaining) setSpots(Math.max(1, departure.spotsRemaining));
  }, [departure, spots]);

  const subtotal = (departure?.price ?? trip.defaultPrice) * spots;

  // Squad code: must resolve to a squad leader. A discount code typed here is
  // moved across to the discount field rather than rejected.
  useEffect(() => {
    const code = form.squadCode.trim().toUpperCase();
    if (!code) { setSquadStatus(null); setRevealed([]); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      validateDiscount({ code, tripSlug: trip.slug, amount: subtotal, departureDate: departure?.date }).then((r) => {
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
  }, [form.squadCode, trip.slug, subtotal, departure?.date]);

  // Discount code (+ optional second stackable code). A squad code typed here
  // is moved across to the squad field.
  useEffect(() => {
    const code = form.discountCode.trim().toUpperCase();
    const code2 = form.secondCode.trim().toUpperCase();
    if (!code) { setDiscountStatus(null); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      validateDiscount({ code, secondCode: code2 || undefined, tripSlug: trip.slug, amount: subtotal, departureDate: departure?.date }).then((r) => {
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
  }, [form.discountCode, form.secondCode, trip.slug, subtotal, departure?.date]);

  const discountAmount = discountStatus?.valid ? discountStatus.amount : 0;
  const appliedDiscount = discountStatus?.valid ? form.discountCode.trim().toUpperCase() : "";
  const appliedSquad = squadStatus?.valid ? form.squadCode.trim().toUpperCase() : "";
  // A typed (or prefilled) code whose check hasn't come back yet. Prefilled
  // links land with codes already in the boxes, so a quick click on pay can
  // beat the validation round trip.
  const codesPending = Boolean(
    (form.squadCode.trim() && !squadStatus) || (form.discountCode.trim() && !discountStatus),
  );

  async function submit() {
    if (!departure) return;
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast.error("Fill in your name, email and phone");
      return;
    }
    if (codesPending) {
      toast("Just checking your code — one second");
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

    if (markCheckoutEventOnce("begin_checkout", `${trip.slug}:${departure.id}:${spots}`)) {
      gtmClearEcommerce();
      gtmPushEvent("begin_checkout", {
        conversion_type: CONVERSION_TYPE_ALL_IN,
        ecommerce: {
          currency: "USD",
          value: departure.price * spots - discountAmount,
          coupon: appliedDiscount,
          items: [buildTripEcommerceItem(trip, departure, { quantity: spots, coupon: appliedDiscount || undefined, discount: discountAmount })],
        },
      });
    }

    try {
      const advisorRef = opts.advisorRef && ADVISOR_REF_PATTERN.test(opts.advisorRef) ? opts.advisorRef : undefined;
      const { url } = await createCheckoutSession({
        tripSlug: trip.slug,
        departureId: departure.id,
        groupSize: spots,
        leadBooker: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        travelers: [],
        // A squad code on its own also travels in discountCode, which is how
        // the server recognised squad codes before squadCode existed.
        discountCode: appliedDiscount || appliedSquad || undefined,
        secondDiscountCode: appliedDiscount && form.secondCode.trim() ? form.secondCode.trim().toUpperCase() : undefined,
        squadCode: appliedSquad || undefined,
        advisorRef,
        utm: opts.utm ?? readUtm(),
        gaClientId: readGaClientId(),
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  }

  return {
    form, setForm, setField,
    spots, setSpots,
    submitting, codesPending,
    squadStatus, discountStatus,
    revealed,
    discountAmount, appliedDiscount, appliedSquad,
    submit,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
