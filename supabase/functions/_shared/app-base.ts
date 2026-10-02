// Where Stripe sends a guest back to after paying.
//
// The live site is mounted at madmonkeyhostels.com/all-in-trips, but a
// browser's Origin header carries no path. Building return URLs from the bare
// origin sent every paying guest to madmonkeyhostels.com/booking-success, a
// 404 on the main Mad Monkey site, while the booking itself went through
// (reported by Ewan, fixed 2 Oct 2026). The lovable.app copy and local dev are
// served from the root, so they keep their origin as is.
const LIVE_BASE = "https://madmonkeyhostels.com/all-in-trips";

export function appBase(origin: string | null | undefined): string {
  if (!origin) return LIVE_BASE;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === "madmonkeyhostels.com" || host.endsWith(".madmonkeyhostels.com")) return `${url.origin}/all-in-trips`;
    return url.origin;
  } catch {
    return LIVE_BASE;
  }
}
