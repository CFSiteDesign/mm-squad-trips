// /checkout — where Adventure Advisors links land.
//
// An advisor picks the trip, date and spots in their own tool; it counts the
// click and 302s here with everything on the query string, so the guest sees
// one departure and a form that is already filled in. Same form and rules as
// the trip page (useCheckout + CheckoutPanel), just without the page around it.
//
// Contract (agreed with Dhany, 3 Sep 2026):
//   /checkout?trip=cambodia&date=2026-10-08&spots=2
//            &first=&last=&email=&phone=%2B44...&squad=&code=
//            &advisor=Ewan&aa=<token>&utm_source=adventure-advisors&utm_medium=advisor
// trip and date are required, the rest optional and editable. `aa` is their
// per-link token and travels untouched into the booking. `advisor` is only a
// label. The personal fields are dropped from the address bar once read.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { fetchTrip } from "@/lib/api";
import { formatPrice, paymentLine } from "@/lib/trip-helpers";
import { dayLabel, endDate } from "@/lib/trip-dates";
import { useCheckout, ADVISOR_REF_PATTERN, type CheckoutFields } from "@/lib/use-checkout";
import { CheckoutPanel } from "@/components/allin/CheckoutPanel";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { TRIPS } from "@/data/trips";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import type { Trip, Departure } from "@/types/trip";

const PERSONAL_PARAMS = ["first", "last", "email", "phone"];
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

type LinkParams = {
  slug: string;
  date: string;
  spots: number;
  initial: Partial<CheckoutFields>;
  advisorName: string;
  advisorRef?: string;
  utm: Record<string, string>;
};

function readLink(p: URLSearchParams): LinkParams {
  const s = (k: string, max = 120) => (p.get(k) ?? "").trim().slice(0, max);
  const aa = s("aa", 40);
  const utm: Record<string, string> = {};
  for (const k of UTM_PARAMS) { const v = s(k, 100); if (v) utm[k] = v; }
  return {
    slug: s("trip", 40).toLowerCase(),
    date: s("date", 10),
    spots: Number(p.get("spots") || "1"),
    initial: {
      firstName: s("first", 80), lastName: s("last", 80), email: s("email", 120), phone: s("phone", 40),
      squadCode: s("squad", 40).toUpperCase(), discountCode: s("code", 40).toUpperCase(),
    },
    advisorName: s("advisor", 40),
    advisorRef: ADVISOR_REF_PATTERN.test(aa) ? aa : undefined,
    utm,
  };
}

export default function AllInCheckout() {
  const [params, setParams] = useSearchParams();
  // Read once. The address bar is cleaned straight after, and a re-read would
  // then wipe the prefill.
  const [link] = useState(() => readLink(params));

  useEffect(() => {
    // Name, email and phone should not outlive the page load in the address
    // bar, browser history or our own page-view analytics.
    if (PERSONAL_PARAMS.some((k) => params.has(k))) {
      const next = new URLSearchParams(params);
      PERSONAL_PARAMS.forEach((k) => next.delete(k));
      setParams(next, { replace: true });
    }
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const knownSlug = TRIPS.some((t) => t.slug === link.slug);
  const { data: trip, isLoading, error } = useQuery({
    queryKey: ["trip", link.slug],
    queryFn: () => fetchTrip(link.slug),
    retry: false,
    enabled: knownSlug,
  });

  return (
    <div className="min-h-screen bg-mm-bone">
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-24 md:pt-28">
        {!knownSlug || error ? (
          <Missing />
        ) : isLoading || !trip ? (
          <div className="space-y-4">
            <div className="h-8 w-48 bg-mm-black/10" />
            <div className="h-64 w-full border-[3px] border-mm-black/20 bg-mm-black/5" />
          </div>
        ) : (
          <CheckoutBody trip={trip} link={link} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Missing() {
  return (
    <div className="border-[3px] border-mm-black bg-mm-bone p-6">
      <p className="font-sticker text-[11px] tracking-[0.14em] text-mm-black">HMM, THAT LINK DOESN'T POINT AT A TRIP</p>
      <p className="mt-2 text-sm text-mm-black/75">Ask your advisor for a fresh one, or browse the trips yourself.</p>
      <Link to="/" className="mt-4 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
        SEE ALL TRIPS <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function CheckoutBody({ trip, link }: { trip: Trip; link: LinkParams }) {
  // The guest can move to another date if the linked one has gone; the form
  // they arrived with comes along, and so does the advisor's token.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const openDates = useMemo(
    () => trip.departures.filter((d) => !d.isPrivate && d.bookable && d.spotsRemaining > 0),
    [trip.departures],
  );
  const linked = trip.departures.find((d) => d.date === link.date);
  const linkedOpen = linked && linked.bookable && linked.spotsRemaining > 0 && !linked.isPrivate ? linked : null;
  const chosen: Departure | null = pickedId ? openDates.find((d) => d.id === pickedId) ?? null : linkedOpen;

  const checkout = useCheckout(trip, chosen, {
    initial: link.initial,
    initialSpots: link.spots,
    advisorRef: link.advisorRef,
    utm: link.utm,
  });

  useEffect(() => {
    if (!markCheckoutEventOnce("view_item", trip.slug)) return;
    gtmClearEcommerce();
    gtmPushEvent("view_item", {
      conversion_type: CONVERSION_TYPE_ALL_IN,
      ecommerce: { currency: "USD", value: trip.defaultPrice, items: [buildTripEcommerceItem(trip, { price: trip.defaultPrice })] },
    });
  }, [trip]);

  const meta = TRIPS.find((t) => t.slug === trip.slug);
  const pay = chosen ? paymentLine(chosen.date, 1, chosen.price) : null;

  return (
    <>
      {link.advisorName && (
        <p className="font-sticker text-[11px] tracking-[0.16em] text-mm-black/60">BOOKING WITH {link.advisorName.toUpperCase()}</p>
      )}
      <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.25rem)] leading-[0.95] text-mm-black">{(meta?.name ?? trip.name).toUpperCase()}</h1>
      <p className="mt-2 text-sm text-mm-black/70">{trip.days} days · {meta?.route ?? ""}</p>

      {chosen ? (
        <section className="mt-6 border-[3px] border-mm-black bg-mm-bone shadow-mm-sm">
          {/* The departure the advisor chose */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-[3px] border-mm-black bg-mm-yellow px-4 py-4">
            <div className="min-w-[104px]">
              <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-black/60">START DATE</p>
              <p className="font-display text-2xl leading-none text-mm-black">{dayLabel(chosen.date)}</p>
            </div>
            <div className="min-w-[104px]">
              <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-black/60">END DATE</p>
              <p className="font-display text-2xl leading-none text-mm-black">{dayLabel(endDate(chosen.date, trip.days))}</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-mm-black/80">
              <Check className="h-4 w-4 text-mm-black" strokeWidth={3} /> {chosen.spotsRemaining} available
            </div>
            <div className="ml-auto text-right">
              {chosen.strikethrough && chosen.strikethrough > chosen.price && (
                <span className="mr-2 text-xs text-mm-black/45 line-through">{formatPrice(chosen.strikethrough)}</span>
              )}
              <span className="font-display text-2xl text-mm-black">{formatPrice(chosen.price)}</span>
              <span className="text-xs text-mm-black/60">/person</span>
            </div>
          </div>

          {/* Deposit terms, on the page rather than only at Stripe's last step */}
          <div className="border-b-[3px] border-mm-black bg-mm-lime px-4 py-3 text-sm leading-snug text-mm-black/85">
            {pay?.type === "deposit" ? (
              <>
                <strong className="text-mm-black">$99 per spot holds your place today.</strong> The balance is charged
                automatically to the same card 7 days before departure. If that charge fails we retry every 2 days and email you.
              </>
            ) : (
              <>
                <strong className="text-mm-black">This departure is inside 7 days,</strong> so it's paid in full today rather than by deposit.
              </>
            )}
          </div>

          <CheckoutPanel trip={trip} departure={chosen} checkout={checkout} />
        </section>
      ) : (
        <section className="mt-6 border-[3px] border-mm-black bg-mm-bone p-4 shadow-mm-sm md:p-5">
          <p className="flex items-center gap-2 font-sticker text-[11px] tracking-[0.14em] text-mm-black">
            <AlertCircle className="h-4 w-4 text-mm-orange" /> THAT DATE ISN'T AVAILABLE ANY MORE
          </p>
          <p className="mt-2 text-sm text-mm-black/75">
            {link.date ? `${dayLabel(link.date)} has gone. ` : ""}Here are the other dates for this trip — pick one and your details carry over.
          </p>
          <div className="mt-4 space-y-2">
            {openDates.map((d) => (
              <button
                key={d.id}
                onClick={() => setPickedId(d.id)}
                className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 border-[3px] border-mm-black bg-mm-bone px-4 py-3 text-left transition-colors hover:bg-mm-yellow"
              >
                <span className="font-display text-lg text-mm-black">{dayLabel(d.date)} → {dayLabel(endDate(d.date, trip.days))}</span>
                <span className="text-sm text-mm-black/70">{d.spotsRemaining} available</span>
                <span className="ml-auto font-display text-lg text-mm-black">{formatPrice(d.price)}<span className="text-xs text-mm-black/60">/person</span></span>
              </button>
            ))}
            {openDates.length === 0 && (
              <p className="text-sm text-mm-black/70">No dates are open for booking right now.</p>
            )}
          </div>
          <p className="mt-4 text-sm text-mm-black/70">
            {link.advisorName ? `Or message ${link.advisorName} and they'll sort another date for you.` : "Or message your advisor and they'll sort another date for you."}
          </p>
        </section>
      )}

      <p className="mt-6 text-sm text-mm-black/70">
        Want to read about the trip first?{" "}
        <Link to={`/${trip.slug}`} className="font-bold text-mm-black underline decoration-mm-pink decoration-2 underline-offset-2">
          See the full itinerary →
        </Link>
      </p>
    </>
  );
}
