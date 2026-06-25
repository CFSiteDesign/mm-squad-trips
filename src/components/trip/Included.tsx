import { Bed, Bus, Compass, HeadphonesIcon, MapPin, PartyPopper, Moon } from "lucide-react";
import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";

export function Included({ trip }: { trip: Trip }) {
  const items = [
    { icon: MapPin, label: `${trip.days} days, ${trip.stops.length} destinations` },
    { icon: Bed, label: "Beds in Mad Monkey hostels every night" },
    { icon: Bus, label: "ALL DOMESTIC TRANSPORT" },
    { icon: Compass, label: `${trip.activityCount} activities` },
    { icon: HeadphonesIcon, label: "24/7 local crew support" },
    { icon: PartyPopper, label: "Loads of free drinks" },
    { icon: Moon, label: "Free pre-trip night. Arrive Sunday before. First night on us." },
    { icon: Bed, label: "Daily breakfast (except when travelling overnight)" },
    { icon: Compass, label: "Lunch + dinner included in some experiences" },
  ];

  return (
    <section id="included" className="relative bg-mm-bone px-5 py-12 text-mm-black md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-6xl">
        <Sticker color="orange" rotate={-3}>WHAT YOU GET</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] md:mt-6 md:text-7xl lg:text-8xl">EVERYTHING<br />SORTED.</h2>

        <ul className="mt-8 grid gap-0 border-mm-thick md:mt-12 md:grid-cols-2 md:border-0">
          {items.map(({ icon: Icon, label }, i) => {
            const isLastMobile = i === items.length - 1;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 px-3 py-3 md:gap-4 md:border-[3px] md:border-mm-black md:px-5 md:py-5 md:shadow-mm-sm
                  ${!isLastMobile ? "border-b-[3px] border-mm-black md:border-b-[3px]" : ""}
                  ${i % 2 === 0 ? "bg-mm-paper" : "bg-mm-lime/30"}
                  md:[&:nth-child(odd)]:bg-mm-paper md:[&:nth-child(even)]:bg-mm-lime/40`}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-mm-black bg-mm-orange md:h-12 md:w-12">
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </span>
                <span className="text-[12px] font-bold uppercase leading-tight tracking-tight md:text-base">{label}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-mm-thick bg-mm-black p-4 text-sm shadow-mm md:mt-10 md:p-6">
          <p className="font-sticker text-[11px] tracking-[0.18em] text-mm-lime md:text-xs md:tracking-[0.22em]">NOT INCLUDED</p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-mm-bone md:mt-3 md:text-base">
            Flights · Additional food + drink · Optional add-ons · Travel insurance
          </p>
        </div>
      </div>
    </section>
  );
}
