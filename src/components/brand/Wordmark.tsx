import { cn } from "@/lib/utils";
import logo from "@/assets/mad-monkey-logo.webp";

/**
 * Mad Monkey logo mark. ALWAYS present bottom-right per brand rule #7.
 * The source asset is black-on-transparent; invert for dark backgrounds.
 */
export function Wordmark({
  tone = "light",
  className,
  size = 56,
}: {
  tone?: "light" | "dark";
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
        tone === "light" && "invert",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function PinnedWordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="pointer-events-none absolute bottom-8 right-8 z-20 md:bottom-12 md:right-12">
      <Wordmark tone={tone} size={64} />
    </div>
  );
}
