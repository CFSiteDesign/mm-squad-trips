import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchTrip } from "@/lib/api";
import { Hero } from "@/components/trip/Hero";
import { Included } from "@/components/trip/Included";
import { Route } from "@/components/trip/Route";
import { IndonesiaItinerary } from "@/components/trip/IndonesiaItinerary";
import { VietnamItinerary } from "@/components/trip/VietnamItinerary";
import { CambodiaItinerary } from "@/components/trip/CambodiaItinerary";
import indoHero from "@/assets/indo-hero.jpg.asset.json";

import { WhosComing } from "@/components/trip/WhosComing";
import { BookingFlow } from "@/components/trip/BookingFlow";
import { FAQ } from "@/components/trip/FAQ";
import { SiteFooter } from "@/components/trip/SiteFooter";
import { SquadCTA } from "@/components/trip/SquadCTA";
import { Skeleton } from "@/components/ui/skeleton";
import { Sticker } from "@/components/brand/Sticker";
import { PinnedWordmark } from "@/components/brand/Wordmark";

function getSetupHint(message: string, slug: string) {
  if (message.includes('Airtable GET Trips [404]')) {
    return `Airtable is connected, but the base does not yet contain a "Trips" table. Verify table names: Trips, Pricing Calendar, Departures, Bookings, Discount Codes, Waitlist.`;
  }
  if (message.includes('Trip not found')) {
    return `Airtable is reachable, but no active trip row has URL Slug "${slug}".`;
  }
  return `Operator check: verify the Airtable base and that slug "${slug}" exists in Trips.`;
}

export default function TripPage() {
  const { slug = "" } = useParams();
  const { data: trip, isLoading, error } = useQuery({
    queryKey: ["trip", slug],
    queryFn: () => fetchTrip(slug),
    retry: false,
  });

  if (error) {
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
        <PinnedWordmark />
      </div>
    );
  }

  // Static itinerary blocks for known slugs — render instantly without trip data.
  const StaticItinerary =
    slug === "indonesia" ? <IndonesiaItinerary days={14} /> :
    slug === "vietnam"   ? <VietnamItinerary   days={14} /> :
    slug === "cambodia"  ? <CambodiaItinerary  days={14} /> :
    null;

  return (
    <main>
      {trip ? (
        <Hero trip={trip} heroImageUrl={slug === "indonesia" ? indoHero.url : undefined} />
      ) : (
        <div className="relative h-[88vh] w-full overflow-hidden bg-mm-black">
          {slug === "indonesia" && (
            <img src={indoHero.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-mm-black/30 via-transparent to-mm-black" />
        </div>
      )}

      {trip ? <Included trip={trip} /> : <Skeleton className="h-40 w-full rounded-none bg-mm-bone/10" />}

      {StaticItinerary ?? (trip ? <Route trip={trip} /> : <Skeleton className="h-96 w-full rounded-none bg-mm-bone/10" />)}

      {trip ? <WhosComing trip={trip} /> : <Skeleton className="h-80 w-full rounded-none bg-mm-bone/10" />}
      {trip ? <BookingFlow trip={trip} /> : <Skeleton className="h-[600px] w-full rounded-none bg-mm-bone/10" />}
      <FAQ />
      <SquadCTA />
      <div className="h-1 bg-mm-bone/20" />
      <SiteFooter />
    </main>
  );
}
