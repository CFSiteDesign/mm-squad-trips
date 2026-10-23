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

// The sites we are willing to point a link at. A browser's Origin header is just text: anyone can send a request with
// `Origin: https://evil.example`, and appBase() above would then build the links in OUR emails on that address. For trip builder
// links that matters, because the crew's Approve / Not approved / Edit it buttons carry a key that opens the review page: a link to
// somebody else's site would hand them that key. So the trip builder only ever builds links on these, and anything else becomes the live site.
//   madmonkeyhostels.com and its subdomains (https), the lovable.app copy, and local development.
// Add more (a staging site) with the secret TRIP_BUILDER_ALLOWED_ORIGINS: hostnames, comma separated, `*.example.com` for every subdomain.
const TRUSTED_HOSTS = ["mm-squad-trips.lovable.app"];

const extraHosts = () => { try { return Deno.env.get("TRIP_BUILDER_ALLOWED_ORIGINS") ?? ""; } catch { return ""; } };   // (no permission to read it, as in a plain `deno test`: none)

export function isTrustedOrigin(origin: string | null | undefined, extra = extraHosts()): boolean {
  if (!origin) return false;
  let url: URL;
  try { url = new URL(origin); } catch { return false; }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return url.protocol === "http:" || url.protocol === "https:";
  if (url.protocol !== "https:") return false;
  if (host === "madmonkeyhostels.com" || host.endsWith(".madmonkeyhostels.com") || TRUSTED_HOSTS.includes(host)) return true;
  return extra.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    .some((rule) => (rule.startsWith("*.") ? host.endsWith(rule.slice(1)) : host === rule));
}

/** Like appBase(), but only for our own sites. Use this for every link the trip builder puts in an email or a payment return. */
export function trustedBase(origin: string | null | undefined, extra?: string): string {
  return isTrustedOrigin(origin, extra) ? appBase(origin) : LIVE_BASE;
}
