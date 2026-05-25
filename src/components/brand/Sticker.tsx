import { cn } from "@/lib/utils";

interface StickerProps {
  children: React.ReactNode;
  color?: "lime" | "yellow" | "pink" | "cyan" | "orange" | "blue" | "purple" | "green";
  rotate?: number;
  className?: string;
}

const COLOR_BG: Record<NonNullable<StickerProps["color"]>, string> = {
  lime: "bg-mm-lime",
  yellow: "bg-mm-yellow",
  pink: "bg-mm-pink",
  cyan: "bg-mm-cyan",
  orange: "bg-mm-orange",
  blue: "bg-mm-blue text-mm-bone",
  purple: "bg-mm-purple text-mm-bone",
  green: "bg-mm-green",
};

export function Sticker({ children, color = "lime", rotate = -4, className }: StickerProps) {
  return (
    <span
      style={{ transform: `rotate(${rotate}deg)` }}
      className={cn(
        "inline-flex items-center gap-1.5 border-[3px] border-mm-black px-3 py-1.5 font-sticker text-xs text-mm-black shadow-mm-sm",
        COLOR_BG[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Starburst({
  children,
  size = 144,
  color = "yellow",
  rotate = -8,
  className,
}: {
  children: React.ReactNode;
  size?: number;
  color?: NonNullable<StickerProps["color"]>;
  rotate?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("starburst", COLOR_BG[color], className)}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <span className="px-2 text-center font-display text-sm leading-[0.9]">{children}</span>
    </div>
  );
}
