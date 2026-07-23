// Staff-facing recommendation leaderboard at /staff-leaderboard.
// Passcode-gated (shared team passcode, NOT the admin password) via the
// staff-leaderboard edge function, which returns only aggregate-safe data.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sticker } from "@/components/brand/Sticker";

type Mention = { name: string; groupSize: number; month: string };

const PASS_KEY = "mm_staff_lb_pass";

export default function StaffLeaderboardPage() {
  const [pass, setPass] = useState<string>(() => {
    try { return sessionStorage.getItem(PASS_KEY) ?? ""; } catch { return ""; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[] | null>(null);
  const [month, setMonth] = useState<string>("all");

  async function fetchBoard(code: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("staff-leaderboard", {
        body: { passcode: code },
      });
      if (fnErr) {
        // supabase-js wraps non-2xx into a generic error; surface a friendly one
        throw new Error("Wrong passcode — ask your GM for the current one.");
      }
      if (!data?.ok) throw new Error(data?.error || "Could not load leaderboard");
      setMentions(data.mentions as Mention[]);
      setPass(code);
      try { sessionStorage.setItem(PASS_KEY, code); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leaderboard");
      setMentions(null);
    } finally {
      setLoading(false);
    }
  }

  // Auto-load if a passcode is remembered for this session
  useEffect(() => {
    if (pass && !mentions && !loading) void fetchBoard(pass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const m of mentions ?? []) if (m.month) s.add(m.month);
    return Array.from(s).sort().reverse();
  }, [mentions]);

  const board = useMemo(() => {
    const list = (mentions ?? []).filter((m) => month === "all" || m.month === month);
    const agg = new Map<string, { display: string; bookings: number; travellers: number }>();
    for (const m of list) {
      const norm = m.name.toLowerCase();
      const cur = agg.get(norm) ?? { display: m.name, bookings: 0, travellers: 0 };
      cur.bookings += 1;
      cur.travellers += m.groupSize;
      agg.set(norm, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.bookings - a.bookings || b.travellers - a.travellers);
  }, [mentions, month]);

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <main className="min-h-screen bg-mm-black px-5 py-10 pt-24 text-mm-bone md:px-8">
      <div className="mx-auto max-w-2xl">
        <Sticker color="lime" rotate={-3}>MAD MONKEY STAFF</Sticker>
        <h1 className="mt-4 font-display text-4xl leading-[0.95] md:text-6xl">
          PITCH IT.<br /><span className="text-mm-lime">TOP THE BOARD.</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-snug text-mm-bone/80">
          Every guest who books an ALL IN trip and names you as their recommendation counts here.
          Bookings = checkouts you drove; Travellers = total people on them.
        </p>

        {!mentions ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (input.trim()) void fetchBoard(input.trim()); }}
            className="mt-8 space-y-3 border-[3px] border-mm-bone bg-mm-black/60 p-5"
          >
            <label className="font-sticker text-[11px] tracking-[0.18em] text-mm-bone/70">
              TEAM PASSCODE
            </label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="PASSCODE"
              autoFocus
              className="h-12 rounded-none border-[3px] border-mm-bone bg-mm-black font-display tracking-widest text-mm-bone placeholder:text-mm-bone/40"
            />
            {error && (
              <p className="font-sticker text-[11px] tracking-[0.15em] text-mm-pink">{error.toUpperCase()}</p>
            )}
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-12 w-full rounded-none border-[3px] border-mm-bone bg-mm-lime font-display text-mm-black hover:bg-mm-lime"
            >
              {loading ? "CHECKING…" : "SHOW THE BOARD →"}
            </Button>
          </form>
        ) : (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 font-sticker text-[10px] tracking-[0.15em] text-mm-bone/70">
                PERIOD
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-10 rounded-none border-[2px] border-mm-bone bg-mm-black px-2 font-sans text-sm text-mm-bone"
                >
                  <option value="all">All time</option>
                  {months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => { setMentions(null); setPass(""); setInput(""); try { sessionStorage.removeItem(PASS_KEY); } catch { /* ignore */ } }}
                className="font-sticker text-[10px] tracking-[0.15em] text-mm-bone/50 underline"
              >
                LOCK
              </button>
            </div>

            {board.length === 0 ? (
              <div className="border-[3px] border-mm-bone bg-mm-black/60 p-6 text-center">
                <p className="font-display text-xl">NO NAMES ON THE BOARD YET</p>
                <p className="mt-2 text-sm text-mm-bone/70">
                  Get pitching — the first guest who books and names you puts you on top.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-[3px] border-mm-bone">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-[3px] border-mm-bone bg-mm-lime text-left text-mm-black">
                      <th className="px-3 py-2.5 font-sticker text-[10px] tracking-[0.15em]">RANK</th>
                      <th className="px-3 py-2.5 font-sticker text-[10px] tracking-[0.15em]">NAME</th>
                      <th className="px-3 py-2.5 text-right font-sticker text-[10px] tracking-[0.15em]">BOOKINGS</th>
                      <th className="px-3 py-2.5 text-right font-sticker text-[10px] tracking-[0.15em]">TRAVELLERS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((r, i) => (
                      <tr key={r.display + i} className={`border-b border-mm-bone/20 ${i < 3 ? "bg-mm-bone/10" : ""}`}>
                        <td className="px-3 py-2.5 font-display text-lg">{medal(i)}</td>
                        <td className="px-3 py-2.5 font-medium">{r.display}</td>
                        <td className="px-3 py-2.5 text-right font-display text-lg text-mm-lime">{r.bookings}</td>
                        <td className="px-3 py-2.5 text-right">{r.travellers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-center font-sticker text-[9px] tracking-[0.15em] text-mm-bone/40">
              CANCELLED BOOKINGS DON'T COUNT · SPELLING VARIANTS OF YOUR NAME MAY SPLIT — TELL GUESTS YOUR FIRST NAME + PROPERTY
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
