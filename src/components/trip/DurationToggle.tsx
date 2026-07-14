import { useNavigate } from "react-router-dom";

/**
 * 7 DAYS / 12+ DAYS toggle for Indonesia & Vietnam trip pages.
 * Switches between the base slug and the "-7" variant slug.
 */
export function DurationToggle({ slug }: { slug: string }) {
  const navigate = useNavigate();

  const isSeven = slug.endsWith("-7");
  const base = slug.replace(/-7$/, "");
  const isStudentPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/students");
  const prefix = isStudentPath ? "/students" : "";

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
        12+ DAYS
      </button>
    </div>
  );
}
