import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { fetchTrip } from "@/lib/api";
import { getTripFallback } from "@/data/tripFallbacks";
import { Hero } from "@/components/trip/Hero";
import { Included } from "@/components/trip/Included";
import { Route } from "@/components/trip/Route";
import { IndonesiaItinerary } from "@/components/trip/IndonesiaItinerary";
import { Indonesia7Itinerary } from "@/components/trip/Indonesia7Itinerary";
import { VietnamItinerary } from "@/components/trip/VietnamItinerary";
import { Vietnam7Itinerary } from "@/components/trip/Vietnam7Itinerary";
import { DurationToggle } from "@/components/trip/DurationToggle";
import { CambodiaItinerary } from "@/components/trip/CambodiaItinerary";
import indoHero from "@/assets/indo-hero.jpg";
import khHero from "@/assets/kh-hero.png";
import vnHero from "@/assets/vn-hero.jpg";

import { BookingFlow } from "@/components/trip/BookingFlow";
import { FAQ } from "@/components/trip/FAQ";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { SquadCTA } from "@/components/trip/SquadCTA";
import { TripCrossSell } from "@/components/trip/TripCrossSell";

import { Skeleton } from "@/components/ui/skeleton";
import { Sticker } from "@/components/brand/Sticker";

const TRIP_SLUGS = ["vietnam", "indonesia", "cambodia", "vietnam-7", "indonesia-7"];

const BOOKING_TICKER = "$99 SECURES YOUR SPOT  ·  CHANGE OF PLANS? LIFETIME DEPOSIT GUARANTEE  ·  $99 SECURES YOUR SPOT  ·  ";


function getSetupHint(_message: string, slug: string) {
  return `Operator check: verify that slug "${slug}" exists in the Trips table and is marked active.`;
}

export default function TripPage() {
  const pathname = useLocation().pathname;
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const slug = segments.find((s) => TRIP_SLUGS.includes(s)) ?? segments[0] ?? "";

  const fallback = getTripFallback(slug);
  const showDurationToggle = ["indonesia", "vietnam", "indonesia-7", "vietnam-7"].includes(slug);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ["trip", slug],
    queryFn: () => fetchTrip(slug),
    retry: false,
    placeholderData: fallback,
  });

  if (error && !fallback) {
    const message = error instanceof Error ? error.message : "Could not reach the trip data.";
    return (
      <div className="relative min-h-screen bg-mm-black px-6 py-24 text-mm-bone">
        <div className="mx-auto max-w-md text-center">
          <Sticker color="pink" rotate={-4}>HEADS UP</Sticker>
          <h1 className="mt-5 font-display text-4xl">TRIP NOT LOADING.</h1>
          <p className="mt-4 text-sm text-mm-bone/80">{message}</p>
          <p className="mt-3 font-sticker text-[10px] tracking-[0.18em] text-mm-bone/60">
            {getSetupHint(message, slug)}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !trip) {
    return (
      <div className="space-y-4 bg-mm-black p-5">
        <Skeleton className="h-[88vh] w-full rounded-none bg-mm-bone/10" />
        <Skeleton className="h-60 w-full rounded-none bg-mm-bone/10" />
      </div>
    );
  }

  if (!trip) return null;

  return (
    <main>
      <Hero
        trip={trip}
        heroImageUrl={
          slug === "indonesia" || slug === "indonesia-7"
            ? indoHero
            : slug === "cambodia"
            ? khHero
            : slug === "vietnam" || slug === "vietnam-7"
            ? vnHero
            : undefined
        }
      />
      <Included trip={trip} />
      {showDurationToggle && (
        <div className="flex justify-center bg-mm-black px-5 pt-12 md:pt-20">
          <DurationToggle slug={slug} />
        </div>
      )}
      {slug === "indonesia-7" ? (
        <Indonesia7Itinerary />
      ) : slug === "vietnam-7" ? (
        <Vietnam7Itinerary />
      ) : slug === "indonesia" ? (
        <IndonesiaItinerary days={trip.days} />
      ) : slug === "vietnam" ? (
        <VietnamItinerary days={trip.days} />
      ) : slug === "cambodia" ? (
        <CambodiaItinerary days={trip.days} />
      ) : (
        <Route trip={trip} />
      )}


      <BookingFlow trip={trip} />
      <div className="ticker bg-mm-lime text-mm-black">
        <div className="ticker-track text-2xl font-black uppercase tracking-tight md:text-3xl">
          <span>{BOOKING_TICKER}{BOOKING_TICKER}{BOOKING_TICKER}</span>
          <span>{BOOKING_TICKER}{BOOKING_TICKER}{BOOKING_TICKER}</span>
        </div>
      </div>
      <FAQ />
      <SquadCTA />
      <TripCrossSell currentSlug={slug} />
      <div className="h-1 bg-mm-bone/20" />
      <SiteFooter />
    </main>
  );
}
