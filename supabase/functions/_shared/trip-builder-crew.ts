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

import { trustedBase } from "./app-base.ts";

export const KEY_DAYS = 30;

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function mac(secret: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(text))).slice(0, 40);
}

let warnedSecret = false;
export function crewSecret(): string {
  const own = Deno.env.get("TRIP_BUILDER_LINK_SECRET");
  if (own) return own;
  // Links signed with the admin password work, but anyone holding one link (every guest does) could guess passwords against its signature offline.
  if (!warnedSecret) { warnedSecret = true; console.warn("TRIP_BUILDER_LINK_SECRET is not set: trip builder links are signed with ADMIN_PASSWORD. Set a long random value (openssl rand -hex 32) instead."); }
  return Deno.env.get("ADMIN_PASSWORD") || "";
}

// A key proves a link came from one of our emails. It is bound to one kind of link ("crew" or "guest") and one trip,
// so a crew key can't be used as a guest key or the other way round, and neither works for a different trip.
async function signKey(kind: "crew" | "guest", ref: string, secret: string, now: number, days: number): Promise<string> {
  if (!secret) throw new Error("No secret configured for trip builder links");
  const exp = Math.floor(now / 1000) + days * 86400;
  return `${exp.toString(36)}.${await mac(secret, `tb${kind}:${ref}:${exp}`)}`;
}
async function verifyKey(kind: "crew" | "guest", ref: string, key: unknown, secret: string, now: number): Promise<boolean> {
  if (!secret || typeof key !== "string" || key.length > 80) return false;
  const [e, sig] = key.split(".");
  const exp = parseInt(e ?? "", 36);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(now / 1000)) return false;
  const want = await mac(secret, `tb${kind}:${ref}:${exp}`);
  if (want.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i); // constant time
  return diff === 0;
}

/** "<expiry in base 36>.<signature>" for the crew's links in the new-trip email. One trip, 30 days. */
export const signCrewKey = (ref: string, secret = crewSecret(), now = Date.now(), days = KEY_DAYS) => signKey("crew", ref, secret, now, days);
export const verifyCrewKey = (ref: string, key: unknown, secret = crewSecret(), now = Date.now()) => verifyKey("crew", ref, key, secret, now);

/** The same for the guest's link in the "your trip is checked" email, where they choose how to pay. One trip, 90 days. */
export const GUEST_KEY_DAYS = 90;
export const signGuestKey = (ref: string, secret = crewSecret(), now = Date.now(), days = GUEST_KEY_DAYS) => signKey("guest", ref, secret, now, days);
export const verifyGuestKey = (ref: string, key: unknown, secret = crewSecret(), now = Date.now()) => verifyKey("guest", ref, key, secret, now);

/** The guest's own trip page, with their key so they can choose how to pay. */
export function guestTripUrl(origin: string | null, ref: string, key?: string): string {
  return `${trustedBase(origin)}/trip-builder/#/trip/${encodeURIComponent(ref)}${key ? `?k=${encodeURIComponent(key)}` : ""}`;
}

export type CrewAction = "review" | "approve" | "decline" | "edit";

/** The link in the email. `do` tells the page which panel to open first. */
export function crewReviewUrl(origin: string | null, ref: string, key: string, action: CrewAction = "review"): string {
  const q = `k=${encodeURIComponent(key)}${action === "review" ? "" : `&do=${action}`}`;
  return `${trustedBase(origin)}/trip-builder/#/crew/${encodeURIComponent(ref)}?${q}`;
}

/* ---------- the summary the builder sends (crew.js), made safe to print ---------- */

export type Tour = { name: string; usd: number | null; est: boolean; payOnDay: boolean; date: string; day: number; fits: boolean; includesBeds: boolean };
export type Next = { to: string; mode: string; hours: string; usd: number; overnight: boolean; date: string };
/** A later stage of a journey (the builder's "Plan my next stage"): where they start, where they have already been, and which trip came before. */
export type Stage = { n: number; parent: string; from: { id: string; name: string } | null; been: string[]; arrival: { to: string; mode: string; hours: string; usd: number; overnight: boolean; date: string } | null };
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
  stage: Stage | null;
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
    stage: readStage(x.stage),
  };
}

/** The stage block of a summary, made safe to print: anything unexpected is dropped. */
export function readStage(v: unknown): Stage | null {
  if (!v || typeof v !== "object") return null;
  const g = v as Record<string, unknown>, f = g.from as Record<string, unknown> | null, a = g.arrival as Record<string, unknown> | null;
  return {
    n: Math.min(20, Math.max(2, Math.round(Number(g.n)) || 2)),
    parent: typeof g.parent === "string" && /^MM-[A-Z0-9]{6}$/.test(g.parent) ? g.parent : "",
    from: f && typeof f === "object" ? { id: s(f.id, 40), name: s(f.name, 80) } : null,
    been: (Array.isArray(g.been) ? g.been : []).slice(0, 40).map((x) => s(x, 80)).filter(Boolean),
    arrival: a && typeof a === "object" ? { to: s(a.to, 80), mode: s(a.mode, 60), hours: s(a.hours, 20), usd: n(a.usd), overnight: a.overnight === true, date: isoDay(a.date) } : null,
  };
}

/** A starting figure for the balance: the trip cost for everyone, less the deposit already paid. Never the guest's own spending money. The crew can change it. */
export function suggestBalance(sum: Summary | null, deposit: number): number {
  if (!sum) return 0;
  return Math.max(0, Math.round(sum.budget.tripCostAllPeople - (Number(deposit) || 0)));
}
