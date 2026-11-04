// The Black Friday line in the page heroes. Renders nothing outside the sale.
import { depositText, saleOff } from "@/lib/black-friday";

export function SaleStrip({ slug, className = "" }: { slug?: string; className?: string }) {
  const off = saleOff(slug ?? "vietnam");
  if (off <= 0) return null;
  return (
    <p className={`inline-block border-[3px] border-mm-black bg-mm-lime px-3 py-2 font-sticker text-[11px] tracking-[0.12em] text-mm-black ${className}`}>
      BLACK FRIDAY · {slug ? `$${off}` : "UP TO $200"} OFF + {depositText(slug)} DEPOSIT · ENDS SUN 29 NOV
    </p>
  );
}
