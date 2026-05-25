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
import { Skeleton } from "@/components/ui/skeleton";

function getSetupHint(message: string, slug: string) {
  if (message.includes('Airtable GET Trips [404]')) {
    return `Airtable is connected, but the base currently does not contain a table named "Trips" for this project. In Airtable, verify the exact table names are Trips, Pricing Calendar, Departures, Bookings, Discount Codes, and Waitlist, then confirm the saved base ID points to that same base.`;
  }

  if (message.includes('Trip not found')) {
    return `The Airtable base is reachable, but there is no active trip row with URL Slug "${slug}" in the Trips table.`;
  }

  return `If you're the operator, verify the Airtable base is set up and that the slug "${slug}" exists in the Trips table.`;
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
      <div className="p-5 space-y-4">
        <Skeleton className="h-[88vh] w-full rounded-none" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !trip) {
    const message = error instanceof Error ? error.message : "Could not reach the trip data.";
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-['Archivo_Black'] text-3xl">Trip not loading</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {message}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {getSetupHint(message, slug)}
        </p>
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
      <SiteFooter />
    </main>
  );
}
