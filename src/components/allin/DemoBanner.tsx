// Only rendered on the Vercel demo build (vite --mode preview-demo). Same
// backend as the live site, so the tag makes sure nobody mistakes one for
// the other.
export function DemoBanner() {
  return (
    <div className="pointer-events-none fixed right-2 top-[60px] z-[90] border-[2px] border-mm-black bg-mm-yellow px-2 py-1 font-sticker text-[9px] tracking-[0.14em] text-mm-black shadow-mm-sm">
      DEMO SITE · NOT LIVE
    </div>
  );
}
