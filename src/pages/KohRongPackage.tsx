// /koh-rong-post-festival: the Koh Rong post-festival package (brief, 9 Nov
// 2026). A scaled-down trip page: what's included, the day plan, and the same
// checkout as every trip (useCheckout + CheckoutPanel), so payment, the guest
// and team emails and admin all work as they do for ALL IN.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import { fetchTrip } from "@/lib/api";
import { formatPrice, paymentLine } from "@/lib/trip-helpers";
import { dayLabel, tripEndDate } from "@/lib/trip-dates";
import { useCheckout } from "@/lib/use-checkout";
import { CheckoutPanel } from "@/components/allin/CheckoutPanel";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { StickyCta, SCROLL_OFFSET } from "@/components/allin/Chrome";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import { usePageTitle } from "@/seo/use-page-title";
import { PACKAGE, PACKAGE_SLUG } from "@/data/koh-rong-package";
import type { Trip, Departure } from "@/types/trip";

const scrollToBooking = () => {
  const el = document.getElementById("booking");
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET, behavior: "smooth" });
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[0.95] text-mm-black">{children}</h2>;
}

export default function KohRongPackage() {
  usePageTitle(`${PACKAGE.name} | Mad Monkey`);
  const { data: trip, isLoading } = useQuery({ queryKey: ["trip", PACKAGE_SLUG], queryFn: () => fetchTrip(PACKAGE_SLUG), retry: false });
  const open = trip?.departures?.find((d) => d.bookable && d.spotsRemaining > 0 && !d.isPrivate) ?? null;
  const price = open?.price ?? trip?.defaultPrice ?? PACKAGE.price;

  useEffect(() => {
    if (!trip || !markCheckoutEventOnce("view_item", trip.slug)) return;
    gtmClearEcommerce();
    gtmPushEvent("view_item", {
      conversion_type: CONVERSION_TYPE_ALL_IN,
      ecommerce: { currency: "USD", value: trip.defaultPrice, items: [buildTripEcommerceItem(trip, { price: trip.defaultPrice })] },
    });
  }, [trip]);

  return (
    <div className="min-h-screen bg-mm-bone pb-24 md:pb-0">
      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden border-b-[4px] border-mm-black bg-mm-black text-mm-bone">
        <img src={PACKAGE.hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-28 md:px-6 md:pb-20 md:pt-36">
          <span className="inline-block border-[2px] border-mm-black bg-mm-yellow px-2 py-1 font-sticker text-[10px] tracking-[0.14em] text-mm-black">{PACKAGE.eyebrow}</span>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,8vw,5rem)] leading-[0.9]">KOH RONG<br /><span className="text-mm-lime">POST-FESTIVAL</span><br />PACKAGE</h1>
          <p className="mt-4 font-sticker text-xs tracking-[0.14em] text-mm-bone/90">{PACKAGE.when.toUpperCase()}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="font-display text-4xl leading-none">{formatPrice(price)}<span className="ml-1 font-sans text-sm text-mm-bone/70">/person</span></p>
            <button onClick={scrollToBooking} className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-bone">
              BOOK YOUR SPOT <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ============ WHY + WHAT'S INCLUDED ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-paper py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-2 md:px-6">
          <div>
            <H>FIVE MORE NIGHTS<br />ON KOH RONG</H>
            <p className="mt-5 text-[15px] leading-snug text-mm-black/80">{PACKAGE.pitch}</p>
            <p className="mt-3 text-[15px] leading-snug text-mm-black/80">{PACKAGE.urgency}</p>
          </div>
          <div>
            <h3 className="mb-3 font-sticker text-[11px] tracking-[0.16em] text-mm-black">WHAT'S INCLUDED</h3>
            <ul className="border-[3px] border-mm-black">
              {PACKAGE.included.map((i, n) => (
                <li key={i} className={`flex items-start gap-2 bg-mm-bone p-3 text-sm text-mm-black ${n > 0 ? "border-t-[2px] border-mm-black/15" : ""}`}>
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mm-green" strokeWidth={3} /> {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ ITINERARY ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-bone py-14">
        <div className="mx-auto max-w-4xl px-5 md:px-6">
          <H>DAY BY DAY</H>
          <ol className="mt-8 space-y-3">
            {PACKAGE.itinerary.map((d) => (
              <li key={d.day} className="flex gap-4 border-[3px] border-mm-black bg-mm-bone p-4 shadow-mm-sm">
                <div className="w-20 shrink-0">
                  <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-pink">DAY {d.day}</p>
                  <p className="mt-1 text-xs text-mm-black/60">{d.date}</p>
                </div>
                <div>
                  <h3 className="font-display text-xl leading-none text-mm-black">{d.title.toUpperCase()}</h3>
                  <p className="mt-1.5 text-sm leading-snug text-mm-black/75">{d.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ PHOTOS ============ */}
      <section className="border-b-[4px] border-mm-black bg-mm-paper py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 md:grid-cols-5 md:px-6">
          {PACKAGE.photos.map((p, i) => (
            <img key={i} src={p.src} alt={p.alt} loading="lazy"
              className={`aspect-[4/5] w-full border-[3px] border-mm-black object-cover ${i === 0 ? "col-span-2 md:col-span-1" : ""}`} />
          ))}
        </div>
      </section>

      {/* ============ BOOKING ============ */}
      <section id="booking" className="border-b-[4px] border-mm-black bg-mm-bone py-14">
        <div className="mx-auto max-w-3xl px-5 md:px-6">
          <H>BOOK YOUR SPOT</H>
          <div className="mt-6">
            {isLoading ? (
              <div className="h-64 w-full border-[3px] border-mm-black/20 bg-mm-black/5" />
            ) : trip && open ? (
              <PackageCheckout trip={trip} departure={open} />
            ) : (
              <div className="border-[3px] border-mm-black bg-mm-bone p-5 shadow-mm-sm">
                <p className="flex items-center gap-2 font-sticker text-[11px] tracking-[0.14em] text-mm-black">
                  <AlertCircle className="h-4 w-4 text-mm-orange" /> THIS PACKAGE ISN'T AVAILABLE TO BOOK RIGHT NOW
                </p>
                <Link to="/" className="mt-4 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-pink px-4 py-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black">
                  SEE ALL TRIPS <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
      {open && <StickyCta onClick={scrollToBooking} label={`BOOK FOR ${formatPrice(price)}`} />}
    </div>
  );
}

function PackageCheckout({ trip, departure }: { trip: Trip; departure: Departure }) {
  const checkout = useCheckout(trip, departure);
  const pay = paymentLine(departure.date, 1, departure.price, trip.slug);

  return (
    <section className="border-[3px] border-mm-black bg-mm-bone shadow-mm-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-[3px] border-mm-black bg-mm-yellow px-4 py-4">
        <div className="min-w-[104px]">
          <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-black/60">CHECK IN</p>
          <p className="font-display text-2xl leading-none text-mm-black">{dayLabel(departure.date)}</p>
        </div>
        <div className="min-w-[104px]">
          <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-black/60">CHECK OUT</p>
          <p className="font-display text-2xl leading-none text-mm-black">{dayLabel(tripEndDate(departure.date, trip))}</p>
        </div>
        <div className="ml-auto text-right">
          {departure.strikethrough && departure.strikethrough > departure.price && (
            <span className="mr-2 text-xs text-mm-black/45 line-through">{formatPrice(departure.strikethrough)}</span>
          )}
          <span className="font-display text-2xl text-mm-black">{formatPrice(departure.price)}</span>
          <span className="text-xs text-mm-black/60">/person</span>
        </div>
      </div>

      {/* Deposit terms on the page, not only at Stripe's last step */}
      <div className="border-b-[3px] border-mm-black bg-mm-lime px-4 py-3 text-sm leading-snug text-mm-black/85">
        {pay.type === "deposit" ? (
          <>
            <strong className="text-mm-black">$99 per spot holds your place today.</strong> The rest is charged automatically to the
            same card 7 days before check-in. If that charge fails we retry every 2 days and email you.
          </>
        ) : (
          <>
            <strong className="text-mm-black">Check-in is inside 7 days,</strong> so it's paid in full today rather than by deposit.
          </>
        )}
      </div>

      <CheckoutPanel trip={trip} departure={departure} checkout={checkout} />
    </section>
  );
}
