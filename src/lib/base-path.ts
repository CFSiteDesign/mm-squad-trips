// Where the app is mounted.
//
// On production the site is served from madmonkeyhostels.com/all-in-trips via a
// Cloudflare rewrite, so the router runs under that basename and anything in
// /public has to be addressed beneath it too. Bundled assets are fine — Vite's
// relative base handles them — but a hand-written "/videos/x.mp4" or
// "/map/index.html" resolves against the domain root and 404s there. On the
// lovable.app domain and the Vercel demo the app sits at the root.
export const BASE_PATH =
  typeof window !== "undefined" && window.location.pathname.startsWith("/all-in-trips")
    ? "/all-in-trips"
    : "";

/** Absolute URL for a file in /public, correct under either mount point. */
export const publicUrl = (path: string) => `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
