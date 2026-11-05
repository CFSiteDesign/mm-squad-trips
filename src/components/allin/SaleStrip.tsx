// The Black Friday line in the page heroes. Renders nothing outside the sale.
import { depositText, earlyAccessWaiting, saleOff, SALE_TERMS_URL } from "@/lib/black-friday";

const STRIP = "inline-block border-[3px] border-mm-black bg-mm-lime px-3 py-2 font-sticker text-[11px] tracking-[0.12em] text-mm-black";

export function SaleStrip({ slug, className = "" }: { slug?: string; className?: string }) {
  const off = saleOff(slug ?? "vietnam");
  if (earlyAccessWaiting()) return <p className={`${STRIP} ${className}`}>BLACK FRIDAY EARLY ACCESS OPENS THU 26 NOV, 12:00 BALI TIME</p>;
  if (off <= 0) return null;
  return (
    <p className={`${STRIP} ${className}`}>
      BLACK FRIDAY · {slug ? `$${off}` : "UP TO $200"} OFF + {depositText(slug)} DEPOSIT · ENDS SUN 29 NOV ·{" "}
      <a href={SALE_TERMS_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">T&amp;CS</a>
    </p>
  );
}
