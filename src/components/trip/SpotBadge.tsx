import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import type { SpotBadge as Badge } from "@/lib/trip-helpers";

const toneClasses: Record<Badge["tone"], string> = {
  green: "bg-[hsl(var(--spot-green))] text-white",
  amber: "bg-[hsl(var(--spot-amber))] text-black",
  orange: "bg-[hsl(var(--spot-orange))] text-white",
  red: "bg-[hsl(var(--spot-red))] text-white",
  grey: "bg-[hsl(var(--spot-grey))] text-white",
};

export function SpotBadge({ badge, className }: { badge: Badge; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[badge.tone],
        className,
      )}
    >
      {badge.flame && <Flame className="h-3 w-3" />}
      {badge.label}
    </span>
  );
}
