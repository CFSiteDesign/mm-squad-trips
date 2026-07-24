import { useNavigate } from "react-router-dom";
import { TRIPS } from "@/data/trips";
import { useSiteVariant } from "@/hooks/use-site-variant";

/**
 * 7 DAYS / X DAYS toggle for Indonesia & Vietnam trip pages.
 * X reflects the long-variant trip length from TRIPS data
 * (or 13 for the student Indonesia itinerary).
 */
export function DurationToggle({ slug }: { slug: string }) {
  const navigate = useNavigate();

  const isSeven = slug.endsWith("-7");
  const base = slug.replace(/-7$/, "");
  // useSiteVariant reads the router's basename-relative path, so this works on
  // both mm-squad-trips.lovable.app (/students/…) and the production domain
  // (/all-in-trips/students/…). Raw window.location broke the latter.
  const isStudentPath = useSiteVariant() === "student";
  const prefix = isStudentPath ? "/students" : "";

  const longTrip = TRIPS.find((t) => t.slug === base);
  const longDays =
    isStudentPath && base === "indonesia" ? 13 : longTrip?.days ?? 12;

  const go = (variant: "long" | "short") => {
    const target = variant === "short" ? `${base}-7` : base;
    navigate(`${prefix}/${target}`);
  };

  const btn = (active: boolean) =>
    [
      "border-[3px] border-mm-bone px-4 py-2 font-sticker text-[11px] tracking-[0.16em] transition-colors md:text-xs",
      active
        ? "bg-mm-lime text-mm-black"
        : "bg-transparent text-mm-bone hover:bg-mm-bone hover:text-mm-black",
    ].join(" ");

  return (
    <div className="relative z-10 inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-black p-1">
      <span className="ml-2 mr-1 font-sticker text-[10px] tracking-[0.18em] text-mm-bone/70">
        DURATION
      </span>
      <button type="button" onClick={() => go("short")} className={btn(isSeven)}>
        7 DAYS
      </button>
      <button type="button" onClick={() => go("long")} className={btn(!isSeven)}>
        {longDays} DAYS
      </button>
    </div>
  );
}
