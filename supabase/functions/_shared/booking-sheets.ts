// Booking sheets (Charlie, 24 Nov 2026): revenue attach the booking endorsement
// to a booking in Admin > Bookings so every booking sheet is tracked with it.
//
// 26 Nov 2026 (Charlie): a Google Drive link instead of an uploaded Excel/PDF.
// The sheet stays in Drive and Drive's sharing decides who can open it; we only
// keep the link. admin-api (service role) is the only thing that reads or writes
// public.booking_sheets. The admin page imports this file too, so the browser
// and the server check links the same way.

export const DRIVE_LINK_MAX = 2000;
const DRIVE_HOSTS = ["drive.google.com", "docs.google.com", "sheets.google.com"];

/** The pasted link as a clean https Google Drive URL, or null when it isn't one. */
export function driveLink(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length > DRIVE_LINK_MAX) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!DRIVE_HOSTS.includes(url.hostname.toLowerCase())) return null;
  if (url.pathname === "/" || url.pathname === "") return null;
  return url.toString();
}

/** Why a link can't be attached, or null when it's fine. */
export function driveLinkProblem(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return "Paste the Google Drive link";
  if (raw.length > DRIVE_LINK_MAX) return "That link is too long";
  return driveLink(raw) ? null : "That isn't a Google Drive link. Copy it from Drive with Share > Copy link";
}

/** What the link points at, shown as the sheet's name in the admin. */
export function driveLinkKind(link: string): string {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return "Google Drive link";
  }
  const path = url.pathname;
  if (url.hostname === "sheets.google.com" || path.startsWith("/spreadsheets/")) return "Google Sheet";
  if (path.startsWith("/document/")) return "Google Doc";
  if (path.startsWith("/presentation/")) return "Google Slides";
  if (/\/folders\//.test(path)) return "Drive folder";
  if (path.startsWith("/file/") || path === "/open" || path === "/uc") return "Drive file";
  return "Google Drive link";
}
