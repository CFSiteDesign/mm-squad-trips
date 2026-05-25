import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import type { SpotBadge as Badge } from "@/lib/trip-helpers";

const toneClasses: Record<Badge["tone"], string> = {
  green:  "bg-mm-lime text-mm-black",
  amber:  "bg-mm-yellow text-mm-black",
  orange: "bg-mm-orange text-mm-black",
  red:    "bg-mm-pink text-mm-black",
  grey:   "bg-mm-black text-mm-bone",
};

export function SpotBadge({ badge, className }: { badge: Badge; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-[3px] border-mm-black px-2.5 py-1 font-sticker text-[10px] tracking-[0.12em] shadow-mm-sm",
        toneClasses[badge.tone],
        className,
      )}
    >
      {badge.flame && <Flame className="h-3 w-3" />}
      {badge.label.toUpperCase()}
    </span>
  );
}
