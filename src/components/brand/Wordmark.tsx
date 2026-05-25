import { cn } from "@/lib/utils";

/**
 * Mad Monkey wordmark. ALWAYS present bottom-right per brand rule #7.
 * White on dark, black on light. ~120–140px wide, 48px safe-area.
 */
export function Wordmark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const fg = tone === "light" ? "text-mm-bone" : "text-mm-black";
  return (
    <div className={cn("pointer-events-none select-none leading-none", fg, className)}>
      <div className="font-display text-[11px] tracking-[0.22em]">MAD</div>
      <div className="font-display text-[26px] tracking-[-0.02em]">MONKEY</div>
      <div className="font-display text-[10px] tracking-[0.3em] opacity-80">HOSTELS</div>
    </div>
  );
}

export function PinnedWordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="pointer-events-none absolute bottom-12 right-12 z-20">
      <Wordmark tone={tone} />
    </div>
  );
}
