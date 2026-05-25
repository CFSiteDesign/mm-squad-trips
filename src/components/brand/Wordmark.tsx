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
    <div className="pointer-events-none absolute left-4 top-3 z-40 md:left-8 md:top-4">
      <Wordmark size={120} className="md:hidden" />
      <Wordmark size={180} className="hidden md:block" />
    </div>
  );
}
