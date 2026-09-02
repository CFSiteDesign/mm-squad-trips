/**
 * Pull the GA4 client id out of the `_ga` cookie (format `GA1.1.<id>.<ts>`).
 * The client id is the `<id>.<ts>` tail. Returns "" if the cookie is absent —
 * which is the case when the visitor declined analytics cookies, so the later
 * server-side balance charge is then reported without attribution (or skipped).
 */
export function readGaClientId(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.([^;]+)/);
  return m ? m[1] : "";
}

/** utm_* parameters on the current URL, for checkout attribution. */
export function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = params.get(k);
    if (v) utm[k] = v;
  }
  return utm;
}
