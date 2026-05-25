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
    <div
      className={cn(
        "pointer-events-none select-none overflow-hidden",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logo}
        alt="Mad Monkey Hostels"
        width={Math.round(size * 3.3)}
        height={size}
        className="h-full max-w-none object-cover object-left"
        style={{ width: size * 3.3, height: size }}
      />
    </div>
  );
}

export function PinnedWordmark() {
  return (
    <div className="pointer-events-none absolute left-4 top-3 z-40 md:left-8 md:top-3">
      <Wordmark size={68} className="md:hidden" />
      <Wordmark size={126} className="hidden md:block" />
    </div>
  );
}
