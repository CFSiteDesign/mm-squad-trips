import { Bed, Bus, Coffee, Compass, HeadphonesIcon, MapPin, PartyPopper, Moon } from "lucide-react";
import type { Trip } from "@/types/trip";

export function Included({ trip }: { trip: Trip }) {
  const items = [
    { icon: MapPin, label: `${trip.days} days, ${trip.stops.length} destinations` },
    { icon: Bed, label: "Beds in Mad Monkey hostels every night" },
    { icon: Bus, label: "All inter-city transport" },
    { icon: Coffee, label: "Daily breakfast" },
    { icon: Compass, label: `${trip.activityCount} named activities` },
    { icon: HeadphonesIcon, label: "24/7 local crew support" },
    { icon: PartyPopper, label: "Welcome night drinks" },
    { icon: Moon, label: "Free pre-trip night — arrive Sunday before, first night is on us" },
  ];

  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-['Archivo_Black'] text-3xl">What's included</h2>
        <ul className="mt-6 grid gap-4">
          {items.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-secondary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium leading-snug">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Not included:</span> Flights · Lunch/dinner · Optional add-ons · Travel insurance
        </div>
      </div>
    </section>
  );
}
