// STAGING ONLY (17 Nov 2026): revert this commit before the Cambodia 7-day goes to main.
// The staging build (VITE_STAGING=true) runs on the live backend, so it must never take a real booking.
export const IS_STAGING = import.meta.env.VITE_STAGING === "true";

export function StagingBadge() {
  if (!IS_STAGING) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[100] border-[3px] border-mm-black bg-mm-yellow px-3 py-2 font-sticker text-[10px] tracking-[0.14em] text-mm-black shadow-mm-sm">
      STAGING PREVIEW · NOT LIVE · BOOKING OFF
    </div>
  );
}
