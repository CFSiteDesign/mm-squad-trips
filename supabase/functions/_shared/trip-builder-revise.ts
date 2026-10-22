// Trip builder: a guest changes their trip after they have sent it (Ewan, 23 Oct 2026).
//
// The guest edits the trip they already sent and presses "Send my changes". That REPLACES the trip on the same request (same reference,
// same deposit, same beds held), so the crew never reviews a plan the guest has already moved on from. Pure rules and shaping here
// (no network), so they are easy to test; the function is trip-builder-revise/index.ts.
//
// Who can change what, by where the request is:
//   pending_payment  deposit not paid yet: the trip is replaced, nobody is told (the crew hasn't seen it)
//   submitted        the crew hasn't started: replaced, the crew gets an UPDATED email
//   checking         the crew is looking at it: replaced, the crew gets an UPDATED email
//   ready            the crew approved it and set a price: the approval and price are withdrawn, it goes back to checking, the crew is told
//   approved         booked and money is moving: the guest can't change it here (they message the crew), so no payment is ever left pointing at a plan that moved
//   declined         over: they start a new trip
// "approved" and "declined" are refused with a 409.

export const EDITABLE = ["pending_payment", "submitted", "checking", "ready"];
export const MAX_REVISIONS = 30;       // per trip: a runaway script can't email the crew forever
export const guestCanEdit = (status: unknown) => EDITABLE.includes(String(status));

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const strs = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, n) : []);

export type Fields = {
  link: string; route: string; days: number; nights: number | null; stops: string[]; countries: string[]; start: string | null; estTotalUsd: number | null;
};
export type Cleaned =
  | { ok: true; f: Fields; note: string; changes: string[]; crewText: string; itinerary: string; summary: unknown | null }
  | { ok: false; error: string };

/** True for a link into the trip builder on our own site (`siteOrigin`, e.g. "https://madmonkeyhostels.com"): the crew opens these from emails, so a guest can't smuggle in someone else's address. */
export function ownTripLink(link: string, siteOrigin: string): boolean {
  try { return new URL(link).origin === siteOrigin && link.includes("#/build/") && /^https?:$/.test(new URL(link).protocol); } catch { return false; }
}

/** The guest's new version, checked. */
export function cleanRevision(body: Record<string, unknown>, siteOrigin: string): Cleaned {
  const t = (body.trip ?? {}) as Record<string, unknown>;
  const link = str(t.link, 2000), route = str(t.route, 400), days = Math.round(Number(t.days) || 0);
  if (!ownTripLink(link, siteOrigin)) return { ok: false, error: "That trip didn't come through properly. Open it from your trip page and try again." };
  if (!route || days < 1 || days > 400) return { ok: false, error: "Add a stop to your trip first." };
  const summary = body.summary && typeof body.summary === "object" && Array.isArray((body.summary as Record<string, unknown>).stops) ? body.summary : null;
  return {
    ok: true,
    f: {
      link, route, days, nights: Math.round(Number(t.nights) || 0) || null, stops: strs(t.stops, 40, 60), countries: strs(t.countries, 10, 4),
      start: typeof t.start === "string" && DATE.test(t.start) ? t.start : null, estTotalUsd: Number.isFinite(Number(t.estTotalUsd)) ? Number(t.estTotalUsd) : null,
    },
    note: str(body.note, 1000),
    changes: strs(body.changes, 8, 140),
    crewText: str(body.crewText, 20_000),
    itinerary: str(body.itinerary, 20_000),
    summary,
  };
}

type Row = Record<string, unknown> & { status: string; route: string | null; days: number | null; est_total_usd: number | null; start_date: string | null; trip_link: string | null; payload: unknown };

export type Update = {
  rev: number; changes: string[]; note: string; wasStatus: string; withdrawn: boolean;
  was: { route: string; days: number; total: string; start: string };
};

/** What to save. `unchanged` when the trip they sent is the one we already have (nothing to tell anyone). */
export function revisionPatch(row: Row, c: Extract<Cleaned, { ok: true }>, nowIso: string): { unchanged: boolean; patch: Record<string, unknown>; rev: number; nextStatus: string; withdrawn: boolean } {
  const payload = { ...((row.payload ?? {}) as Record<string, unknown>) };
  const prevRev = Number(payload.rev) || 0;
  if (c.f.link === (row.trip_link ?? "") && !c.note) return { unchanged: true, patch: {}, rev: prevRev, nextStatus: row.status, withdrawn: false };
  const rev = prevRev + 1, withdrawn = row.status === "ready";
  const history = (Array.isArray(payload.history) ? payload.history : []).slice(-9) as unknown[];
  history.push({ rev, at: nowIso, by: "guest", from_status: row.status, note: c.note || null, changes: c.changes,
    was: { route: row.route, days: row.days, estTotalUsd: row.est_total_usd, start: row.start_date, link: row.trip_link } });
  delete payload.original; delete payload.revision;          // a crew edit is replaced by what the guest has just sent
  if (c.summary) payload.summary = c.summary;
  if (c.crewText) payload.crewText = c.crewText;
  payload.rev = rev; payload.history = history; payload.guestNote = c.note || null;
  const nextStatus = withdrawn ? "checking" : row.status;
  return {
    unchanged: false, rev, nextStatus, withdrawn,
    patch: {
      trip_link: c.f.link, route: c.f.route, days: c.f.days, nights: c.f.nights, stops: c.f.stops, countries: c.f.countries, start_date: c.f.start,
      est_total_usd: c.f.estTotalUsd ?? row.est_total_usd,
      itinerary: c.crewText || c.itinerary || (row as Record<string, unknown>).itinerary || null,
      payload, status: nextStatus,
      // An approval is about a particular plan. The plan has moved, so the price and anything built on it go too; the crew approves the new one.
      ...(withdrawn ? { balance_amount: null, balance_session_id: null, balance_url: null, pay_plan: null, pay_schedule: [], crew_note: null } : {}),
    },
  };
}

/** The revision as the crew's email and review page tell it. */
export function lastRevision(payload: unknown): { rev: number; at: string; note: string; changes: string[]; wasStatus: string; was: Record<string, unknown> } | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const h = Array.isArray(p.history) ? p.history : [];
  const x = h[h.length - 1] as Record<string, unknown> | undefined;
  if (!x || x.by !== "guest") return null;
  return { rev: Number(x.rev) || 0, at: String(x.at ?? ""), note: String(x.note ?? ""), changes: Array.isArray(x.changes) ? (x.changes as unknown[]).map(String).slice(0, 8) : [], wasStatus: String(x.from_status ?? ""), was: (x.was ?? {}) as Record<string, unknown> };
}

export const currentRev = (payload: unknown) => Number(((payload ?? {}) as Record<string, unknown>).rev) || 0;
