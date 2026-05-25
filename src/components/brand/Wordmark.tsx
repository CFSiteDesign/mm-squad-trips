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
  const width = Math.round(size * 3.3);

  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      style={{ width, height: size }}
    >
      <img
        src={logo}
        alt="Mad Monkey Hostels"
        width={width}
        height={size}
        className="block h-full w-full object-contain object-left"
        style={{ width, height: size }}
      />
    </div>
  );
}

export function PinnedWordmark() {
  return (
    <div className="pointer-events-none absolute left-4 top-3 z-40 md:left-8 md:top-4">
      <Wordmark size={30} className="md:hidden" />
      <Wordmark size={52} className="hidden md:block" />
    </div>
  );
}
