import { Bed, Bus, Compass, HeadphonesIcon, MapPin, PartyPopper, Moon, Sparkles, Utensils } from "lucide-react";
import type { Trip } from "@/types/trip";
import { Sticker } from "@/components/brand/Sticker";
import { useSiteVariant } from "@/hooks/use-site-variant";

export function Included({ trip }: { trip: Trip }) {
  const variant = useSiteVariant();
  const isStudent = variant === "student";
  const isVietnam = trip.slug === "vietnam";
  const isVietnam7 = trip.slug === "vietnam-7";
  const isIndonesia7 = trip.slug === "indonesia-7";
  const isStudentIndonesia = isStudent && trip.slug === "indonesia";


  let items;
  if (isStudentIndonesia) {
    items = [
      { icon: Sparkles, label: "EVERYTHING SORTED" },
      { icon: MapPin, label: "13 DAYS, 4 DESTINATIONS" },
      { icon: Bus, label: "ALL TRANSFERS + ISLAND BOATS" },
      { icon: HeadphonesIcon, label: "24/7 LOCAL CREW" },
      { icon: Moon, label: "FREE PRE-NIGHT TRIP, ARRIVE FRIDAY BEFORE, FIRST NIGHT ON US" },
      { icon: Utensils, label: "4 BREAKFASTS, 5 LUNCHES, 5 DINNERS" },
      { icon: PartyPopper, label: "LOADS OF FREE DRINKS INCLUDED THROUGHOUT" },
      { icon: Compass, label: "ALL ACTIVITIES INCLUDED IN THE ITINERARY" },
      { icon: Bed, label: "DORM BEDS AT MAD MONKEY" },
    ];
  } else if (isVietnam) {
    items = [
      { icon: Sparkles, label: "EVERYTHING SORTED" },
      { icon: MapPin, label: "14 DAYS, 5 DESTINATIONS" },
      { icon: Bus, label: "ALL DOMESTIC TRANSPORT" },
      { icon: HeadphonesIcon, label: "24/7 LOCAL CREW" },
      { icon: Moon, label: "FREE PRE-TRIP NIGHT — ARRIVE THE SUNDAY BEFORE, FIRST NIGHT ON US" },
      { icon: Utensils, label: "12 BREAKFASTS, 9 LUNCHES, 6 DINNERS" },
      { icon: PartyPopper, label: "LOADS OF FREE-FLOW BEER, HAPPY WATER + SHOTS THROUGHOUT" },
      { icon: Compass, label: "ALL ACTIVITIES INCLUDED IN THE ITINERARY" },
      { icon: Bed, label: "DORM BEDS AT MAD MONKEY + LOCAL HOMESTAYS" },
    ];
  } else if (isVietnam7) {
    items = [
      { icon: Bus, label: "ALL DOMESTIC TRANSPORT" },
      { icon: HeadphonesIcon, label: "24/7 LOCAL CREW" },
      { icon: Utensils, label: "7 BREAKFASTS, 4 LUNCHES, 4 DINNERS" },
      { icon: PartyPopper, label: "LOADS OF FREE FLOW BEER, HAPPY WATER + SHOTS THROUGHOUT" },
      { icon: Compass, label: "ALL ACTIVITIES INCLUDED IN THE ITINERARY" },
      { icon: Bed, label: "DORM BEDS AT MAD MONKEY + LOCAL HOMESTAYS" },
    ];
  } else if (isIndonesia7) {
    items = [
      { icon: Bus, label: "ALL TRANSFERS + ISLAND BOATS" },
      { icon: HeadphonesIcon, label: "24/7 LOCAL CREW" },
      { icon: Moon, label: "FREE PRE-TRIP NIGHT, FIRST NIGHT ON US" },
      { icon: Utensils, label: "4 BREAKFASTS, 5 LUNCHES, 5 DINNERS" },
      { icon: PartyPopper, label: "LOADS OF FREE DRINKS INCLUDED THROUGHOUT" },
      { icon: Compass, label: "ALL ACTIVITIES INCLUDED IN THE ITINERARY" },
      { icon: Bed, label: "DORM BEDS AT MAD MONKEY" },
    ];
  } else {
    items = [
      { icon: MapPin, label: `${trip.days} days, ${trip.stops.length} destinations` },
      { icon: Bed, label: "Beds in Mad Monkey hostels every night" },
      { icon: Bus, label: "ALL DOMESTIC TRANSPORT" },
      { icon: Compass, label: `${trip.activityCount} activities` },
      { icon: HeadphonesIcon, label: "24/7 local crew support" },
      { icon: PartyPopper, label: "Loads of free drinks" },
      { icon: Moon, label: "Free pre-trip night. Arrive Sunday before. First night on us." },
      { icon: Compass, label: "Lunch + dinner included in some experiences" },
    ];
  }

  const notIncluded = (isVietnam || isVietnam7 || isIndonesia7 || isStudentIndonesia)
    ? "Flights · Additional food, drink + personal expenses · Upgrades + optional add-ons · Insurance"
    : "Flights · Additional food + drink · Optional add-ons · Travel insurance";


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
            {notIncluded}
          </p>
        </div>
      </div>
    </section>
  );
}
