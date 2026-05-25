import { cn } from "@/lib/utils";
import logo from "@/assets/mad-monkey-logo.webp";

/**
 * Mad Monkey logo mark.
 */
export function Wordmark({
  className,
  size = 56,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src={logo}
      alt="Mad Monkey Hostels"
      width={size}
      height={size}
      className={cn(
        "pointer-events-none select-none object-contain",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function PinnedWordmark() {
  return (
    <div className="pointer-events-none absolute left-4 top-1 z-40 md:left-8 md:-top-2">
      <Wordmark size={84} className="md:hidden" />
      <Wordmark size={200} className="hidden md:block" />
    </div>
  );
}
