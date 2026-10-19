// Trip builder: the crew review links (Ewan, 20 Oct 2026).
//
// The email a crew member gets for a new trip carries three buttons (Approve,
// Not approved, Edit it). Each opens the trip builder's crew review page, which
// shows the trip exactly as the guest built it. The page proves it was opened
// from that email with a key: HMAC-SHA256 of the trip's reference and an expiry,
// signed with the same secret as the admin tokens (ADMIN_PASSWORD, or
// TRIP_BUILDER_LINK_SECRET if you would rather rotate them separately).
//
// A key only ever works for the one trip it was made for, and runs out after
// KEY_DAYS. The key travels in the #fragment of the link, so it is never sent to
// a server or written to a log. Opening the link only READS: nothing is approved,
// declined or refunded until a person presses the confirm button on the page, so
// an email scanner that follows the links can't trigger anything.

import { appBase } from "./app-base.ts";

export const KEY_DAYS = 30;

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function mac(secret: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(text))).slice(0, 40);
}

export function crewSecret(): string {
  return Deno.env.get("TRIP_BUILDER_LINK_SECRET") || Deno.env.get("ADMIN_PASSWORD") || "";
}

/** "<expiry in base 36>.<signature>" for one trip reference. */
export async function signCrewKey(ref: string, secret = crewSecret(), now = Date.now(), days = KEY_DAYS): Promise<string> {
  if (!secret) throw new Error("No secret configured for crew links");
  const exp = Math.floor(now / 1000) + days * 86400;
  return `${exp.toString(36)}.${await mac(secret, `tbcrew:${ref}:${exp}`)}`;
}

export async function verifyCrewKey(ref: string, key: unknown, secret = crewSecret(), now = Date.now()): Promise<boolean> {
  if (!secret || typeof key !== "string" || key.length > 80) return false;
  const [e, sig] = key.split(".");
  const exp = parseInt(e ?? "", 36);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const want = await mac(secret, `tbcrew:${ref}:${exp}`);
  if (want.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i); // constant time
  return diff === 0;
}

export type CrewAction = "review" | "approve" | "decline" | "edit";

/** The link in the email. `do` tells the page which panel to open first. */
export function crewReviewUrl(origin: string | null, ref: string, key: string, action: CrewAction = "review"): string {
  const q = `k=${encodeURIComponent(key)}${action === "review" ? "" : `&do=${action}`}`;
  return `${appBase(origin)}/trip-builder/#/crew/${encodeURIComponent(ref)}?${q}`;
}

/* ---------- the summary the builder sends (crew.js), made safe to print ---------- */

export type Tour = { name: string; usd: number | null; est: boolean; payOnDay: boolean; date: string; day: number; fits: boolean; includesBeds: boolean };
export type Next = { to: string; mode: string; hours: string; usd: number; overnight: boolean; date: string };
export type Stop = {
  kind: "stop" | "allin"; name: string; country: string; nights: number; days: number; usd: number; from: string; to: string;
  route: string; bedUsd: number; bedsUsd: number; partner: boolean; tours: Tour[]; next: Next | null;
};
export type Budget = {
  beds: number; tours: number; transport: number; allIn: number; squadDiscount: number; tripCost: number; spendPerDay: number; spendFund: number;
  total: number; people: number; tripCostAllPeople: number; totalAllPeople: number; guestBudget: number; budgetLeft: number | null;
};
export type Summary = {
  headline: string; days: number; nights: number; stopCount: number; countries: string[]; start: string; end: string; datesLabel: string;
  people: number; pref: string; stops: Stop[]; budget: Budget; flags: { level: "warn" | "info"; text: string }[];
};

const s = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isoDay = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/** Reads `payload.summary` from a saved request. Returns null for older trips that were sent before the summary existed. */
export function readSummary(payload: unknown): Summary | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const x = p.summary as Record<string, unknown> | undefined;
  if (!x || typeof x !== "object" || !Array.isArray(x.stops) || typeof x.budget !== "object" || !x.budget) return null;
  const b = x.budget as Record<string, unknown>;
  return {
    headline: s(x.headline), days: n(x.days), nights: n(x.nights), stopCount: n(x.stopCount), countries: (Array.isArray(x.countries) ? x.countries : []).slice(0, 10).map((c) => s(c, 40)),
    start: isoDay(x.start), end: isoDay(x.end), datesLabel: s(x.datesLabel, 60), people: Math.min(8, Math.max(1, n(x.people) || 1)), pref: s(x.pref, 40),
    stops: (x.stops as Record<string, unknown>[]).slice(0, 40).map((t) => ({
      kind: t.kind === "allin" ? "allin" : "stop", name: s(t.name, 80), country: s(t.country, 40), nights: n(t.nights), days: n(t.days), usd: n(t.usd), from: isoDay(t.from), to: isoDay(t.to),
      route: s(t.route, 200), bedUsd: n(t.bedUsd), bedsUsd: n(t.bedsUsd), partner: t.partner === true,
      tours: (Array.isArray(t.tours) ? (t.tours as Record<string, unknown>[]) : []).slice(0, 30).map((a) => ({
        name: s(a.name, 120), usd: a.usd == null ? null : n(a.usd), est: a.est === true, payOnDay: a.payOnDay === true, date: isoDay(a.date), day: n(a.day), fits: a.fits !== false, includesBeds: a.includesBeds === true,
      })),
      next: t.next && typeof t.next === "object"
        ? (() => { const q = t.next as Record<string, unknown>; return { to: s(q.to, 80), mode: s(q.mode, 60), hours: s(q.hours, 20), usd: n(q.usd), overnight: q.overnight === true, date: isoDay(q.date) }; })()
        : null,
    })),
    budget: {
      beds: n(b.beds), tours: n(b.tours), transport: n(b.transport), allIn: n(b.allIn), squadDiscount: n(b.squadDiscount), tripCost: n(b.tripCost), spendPerDay: n(b.spendPerDay),
      spendFund: n(b.spendFund), total: n(b.total), people: Math.min(8, Math.max(1, n(b.people) || 1)), tripCostAllPeople: n(b.tripCostAllPeople), totalAllPeople: n(b.totalAllPeople),
      guestBudget: n(b.guestBudget), budgetLeft: b.budgetLeft == null ? null : n(b.budgetLeft),
    },
    flags: (Array.isArray(x.flags) ? (x.flags as Record<string, unknown>[]) : []).slice(0, 16).map((f) => ({ level: f.level === "warn" ? "warn" as const : "info" as const, text: s(f.text, 400) })),
  };
}

/** A starting figure for the balance: the trip cost for everyone, less the deposit already paid. Never the guest's own spending money. The crew can change it. */
export function suggestBalance(sum: Summary | null, deposit: number): number {
  if (!sum) return 0;
  return Math.max(0, Math.round(sum.budget.tripCostAllPeople - (Number(deposit) || 0)));
}
