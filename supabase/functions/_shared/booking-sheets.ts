// Booking sheets (Charlie, 24 Nov 2026): revenue attach the Excel booking
// endorsement to a booking in Admin > Bookings. The files sit in the private
// "booking-sheets" bucket under a folder per booking ref; only admin-api
// (service role) can read or write them.

export const SHEETS_BUCKET = "booking-sheets";
export const SHEET_MAX_BYTES = 10 * 1024 * 1024;
/** Excel first; CSV and PDF in case the sheet gets exported. */
export const SHEET_EXTENSIONS = ["xlsx", "xls", "xlsm", "csv", "pdf"];

export function sheetExtension(fileName: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(String(fileName ?? "").trim());
  const ext = m ? m[1].toLowerCase() : "";
  return SHEET_EXTENSIONS.includes(ext) ? ext : null;
}

/** Why a file can't be attached, or null when it's fine. */
export function sheetProblem(fileName: string, size: number): string | null {
  if (!sheetExtension(fileName)) return "Attach an Excel file (.xlsx, .xls, .xlsm), a .csv or a .pdf";
  if (!Number.isFinite(size) || size <= 0) return "That file is empty";
  if (size > SHEET_MAX_BYTES) return "That file is over 10 MB";
  return null;
}

/** "GRP-CAM-001" stays as it is; anything that isn't a plain ref character becomes "_". */
export function sheetFolder(bookingRef: string): string {
  return String(bookingRef ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);
}

/** Where a new upload goes: "<ref>/<stamp>-<clean name>.<ext>". The stamp keeps re-uploads apart. */
export function sheetPath(bookingRef: string, fileName: string, stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`): string {
  const ext = sheetExtension(fileName) ?? "xlsx";
  const base = String(fileName ?? "").trim().replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "booking-sheet";
  return `${sheetFolder(bookingRef)}/${stamp}-${base}.${ext}`;
}

/** A path handed back by the browser must sit straight inside that booking's folder. */
export function sheetPathBelongsTo(path: string, bookingRef: string): boolean {
  const folder = sheetFolder(bookingRef);
  const parts = String(path ?? "").split("/");
  return !!folder && parts.length === 2 && parts[0] === folder && /^[A-Za-z0-9_.-]+$/.test(parts[1]) && !parts[1].startsWith(".");
}
