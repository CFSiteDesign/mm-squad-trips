import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchTrip } from "@/lib/api";
import { Hero } from "@/components/trip/Hero";
import { Included } from "@/components/trip/Included";
import { Route } from "@/components/trip/Route";
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

  if (isLoading) {
    return (
      <div className="space-y-4 bg-mm-black p-5">
        <Skeleton className="h-[88vh] w-full rounded-none bg-mm-bone/10" />
        <Skeleton className="h-60 w-full rounded-none bg-mm-bone/10" />
      </div>
    );
  }

  if (error || !trip) {
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

  return (
    <main>
      <Hero trip={trip} />
      <Included trip={trip} />
      <Route trip={trip} />
      <WhosComing trip={trip} />
      <BookingFlow trip={trip} />
      <FAQ />
      <SquadCTA />
      <SiteFooter />
    </main>
  );
}
