// Trip builder: Find your crew (Ewan, 3 Nov 2026). Guests who tick it ask to be introduced to other travellers on a similar route at the same time. A person on the crew makes
// every introduction, only after both have said yes; the site never shows one guest another's details. Spec: docs/FIND-YOUR-CREW.md in Ewan's builder repo.
// cleanCrew is the server's copy of MM.cleanCrew in public/trip-builder/logic.js, and is the only way answers get in. Pure functions only, covered by trip-builder-find-crew.test.ts.

const AGES: [string, string][] = [["18-21", "18–21"], ["22-25", "22–25"], ["26-29", "26–29"], ["30-35", "30–35"], ["36+", "36+"]];
const GENDERS: [string, string][] = [["woman", "A woman"], ["man", "A man"], ["nonbinary", "Non-binary"], ["", "Prefer not to say"]];
const LIFE: [string, string][] = [["gap-year", "Gap year"], ["uni-break", "Between uni years"], ["graduated", "Just graduated"], ["career-break", "Career break"], ["quit-job", "Quit my job"], ["sabbatical", "Sabbatical"], ["remote", "Working remotely"]];
const VIBES: [string, string][] = [["party", "Party + people"], ["islands", "Islands + beaches"], ["moto", "Motorbikes + mountains"], ["culture", "Culture + history"], ["adventure", "Adventure"], ["food", "Food"], ["chill", "Slow + chill"], ["surf", "Surf + dive"]];
const PICKS = 3;
const keys = (list: [string, string][]) => list.map((x) => x[0]);
const label = (list: [string, string][], k: string) => list.find((x) => x[0] === k)?.[1] ?? "";

export const INTRO_STATUSES = ["new", "asked", "yes", "introduced", "no"];

export type FindCrew = {
  on: true; age: string; gender: string; home: string; life: string[]; vibes: string[]; about: string;
  want: { who: "anyone" | "women"; ages: "near" | "any"; solo: boolean }; consent: true; adult: true;
};

function plainText(s: unknown, n: number): string {
  // deno-lint-ignore no-control-regex
  return String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

/** Whatever arrives, only known values survive. Null unless they switched it on, said they're 18 or over and agreed to be introduced. "Women only" is honoured for women only; anyone else asking for it is matched with anyone. */
export function cleanCrew(x: unknown): FindCrew | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (r.on !== true || r.consent !== true || r.adult !== true || typeof r.age !== "string" || !keys(AGES).includes(r.age)) return null;
  const gender = typeof r.gender === "string" && keys(GENDERS).includes(r.gender) ? r.gender : "";
  const w = (r.want && typeof r.want === "object" ? r.want : {}) as Record<string, unknown>;
  const pick = (arr: unknown, allowed: string[]) => (Array.isArray(arr) ? arr : []).filter((k, i, a) => allowed.includes(k) && a.indexOf(k) === i).slice(0, PICKS) as string[];
  return {
    on: true, age: r.age, gender, home: plainText(r.home, 40), life: pick(r.life, keys(LIFE)), vibes: pick(r.vibes, keys(VIBES)), about: plainText(r.about, 140),
    want: { who: w.who === "women" && gender === "woman" ? "women" : "anyone", ages: w.ages === "any" ? "any" : "near", solo: w.solo === true }, consent: true, adult: true,
  };
}

/** Their answers as label and value rows, for the new-trip email. Nothing for a trip without it on. Values are plain text: the email escapes them. */
export function crewAnswers(v: unknown): { k: string; v: string }[] {
  const c = cleanCrew(v);
  if (!c) return [];
  const list = (ks: string[], from: [string, string][]) => ks.map((k) => label(from, k)).join(", ");
  const rows = [
    { k: "Age", v: label(AGES, c.age) },
    { k: "They are", v: label(GENDERS, c.gender) },
    { k: "From", v: c.home },
    { k: "Wants to meet", v: `${c.want.who === "women" ? "Women only" : "Anyone"}, ${c.want.ages === "any" ? "any age (18+)" : "around their age"}${c.want.solo ? ", only people travelling solo" : ""}` },
    { k: "Where they're at", v: list(c.life, LIFE) },
    { k: "Vibe", v: list(c.vibes, VIBES) },
    { k: "About them", v: c.about },
  ];
  return rows.filter((r) => r.v);
}

/** A pair of trips is one introduction, whichever way round it is asked for, and never a trip with itself. Null when either ref isn't one of ours. */
export function introPair(a: unknown, b: unknown): { a: string; b: string } | null {
  const x = String(a ?? "").trim().toUpperCase(), y = String(b ?? "").trim().toUpperCase(), ref = /^MM-[A-Z0-9]{6}$/;
  if (!ref.test(x) || !ref.test(y) || x === y) return null;
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

/** A trip stays on the board until it's declined or over. No date yet: not over. */
export function onCrewBoard(row: { status?: unknown; start_date?: unknown; days?: unknown }, now = new Date()): boolean {
  if (!["submitted", "checking", "ready", "approved"].includes(String(row.status))) return false;
  const start = typeof row.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.start_date) ? new Date(`${row.start_date}T00:00:00Z`) : null;
  if (!start) return true;
  const end = start.getTime() + Math.max(0, Number(row.days) || 0) * 86_400_000;
  return end >= new Date(now.toISOString().slice(0, 10) + "T00:00:00Z").getTime();
}
