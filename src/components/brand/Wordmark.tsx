import { cn } from "@/lib/utils";
import logo from "@/assets/mad-monkey-logo-solid.png";

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
      className={cn(
        "pointer-events-none select-none",
        className,
      )}
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
      <div className="inline-flex items-center justify-start border-mm-thick border-mm-black bg-mm-bone px-2 py-1 shadow-mm md:px-3 md:py-1.5">
      <Wordmark size={48} className="md:hidden" />
      <Wordmark size={64} className="hidden md:block" />
      </div>
    </div>
  );
}
