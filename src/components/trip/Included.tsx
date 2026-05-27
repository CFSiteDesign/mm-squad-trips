import { Bed, Bus, Coffee, Compass, HeadphonesIcon, MapPin, PartyPopper, Moon } from "lucide-react";
import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";

export function Included({ trip }: { trip: Trip }) {
  const items = [
    { icon: MapPin, label: `${trip.days} days, ${trip.stops.length} destinations` },
    { icon: Bed, label: "Beds in Mad Monkey hostels every night" },
    { icon: Bus, label: "All inter-city transport" },
    { icon: Coffee, label: "Daily breakfast" },
    { icon: Compass, label: `${trip.activityCount} activities` },
    { icon: HeadphonesIcon, label: "24/7 local crew support" },
    { icon: PartyPopper, label: "Welcome night drinks" },
    { icon: Moon, label: "Free pre-trip night. Arrive Sunday before. First night on us." },
  ];

  return (
    <section className="relative bg-mm-bone px-5 py-12 text-mm-black md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <Sticker color="orange" rotate={-3}>WHAT YOU GET</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] md:text-6xl">EVERYTHING<br />SORTED.</h2>



        <ul className="mt-8 grid gap-0 border-mm-thick md:mt-10">
          {items.map(({ icon: Icon, label }, i) => (
            <li
              key={label}
              className={`flex items-center gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4 ${i < items.length - 1 ? "border-b-[3px] border-mm-black" : ""} ${i % 2 === 0 ? "bg-mm-paper" : "bg-mm-lime/30"}`}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-mm-black bg-mm-orange md:h-10 md:w-10">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase leading-tight tracking-tight md:text-sm">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-mm-thick bg-mm-black p-4 text-sm shadow-mm md:mt-8 md:p-5">
          <p className="font-sticker text-[11px] tracking-[0.18em] text-mm-lime">NOT INCLUDED</p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-mm-bone md:text-sm">

            Flights · Lunch + dinner · Optional add-ons · Travel insurance
          </p>
        </div>
      </div>
    </section>
  );
}
