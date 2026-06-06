import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { getSquadDashboard, type SquadDashboardData } from "@/lib/squad";

export default function SquadDashboard() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [data, setData] = useState<SquadDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing access token");
      return;
    }
    getSquadDashboard(token).then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-mm-paper p-8 text-mm-black">
        <div className="max-w-md border-mm-thick bg-mm-bone p-8 text-center shadow-mm">
          <h1 className="font-display text-2xl">CAN'T LOAD YOUR DASHBOARD</h1>
          <p className="mt-3 text-sm text-mm-black/70">{error}</p>
          <Link
            to="/squad-leader"
            className="mt-6 inline-flex border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-display text-mm-bone shadow-mm-sm"
          >
            BACK TO HUB
          </Link>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-mm-paper text-mm-black">
        <p className="font-sticker text-xs tracking-[0.18em]">LOADING…</p>
      </main>
    );
  }

  const { leader, bookings, count, tier } = data;
  const code = leader.code;

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-mm-paper text-mm-black">
      {/* Top banner */}
      <section className="bg-mm-black px-5 py-14 text-mm-bone md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Sticker color="lime" rotate={-3}>YOUR SQUAD CODE</Sticker>
            <div className="mt-4 font-display text-4xl tracking-[0.1em] md:text-6xl">{code}</div>
            <p className="mt-3 text-mm-bone/80">Hey {leader.name.split(" ")[0]} — share this with your crew. Every booking ticks you up the rewards.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-bone px-5 py-3 font-display text-sm text-mm-black shadow-mm-sm"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "COPIED" : "COPY"}
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 border-[3px] border-mm-bone bg-mm-pink px-5 py-3 font-display text-sm text-mm-bone shadow-mm-sm"
            >
              <Share2 className="h-4 w-4" /> SHARE
            </button>
          </div>
        </div>
      </section>

      {/* Progress */}
      <section className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl md:text-5xl">YOUR SQUAD SO FAR</h2>
            <div className="font-sticker text-xs tracking-[0.15em] text-mm-black/70">{count}/8 BOOKED</div>
          </div>

          <div className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => {
              const b = bookings[i];
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center border-[3px] p-3 ${
                    b ? "border-mm-black bg-mm-lime shadow-mm-sm" : "border-mm-black/30 bg-mm-bone"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center border-[2px] border-mm-black ${
                      b ? "bg-mm-pink text-mm-bone" : "bg-mm-paper text-mm-black/40"
                    }`}
                  >
                    {b ? <Check className="h-5 w-5" /> : <span className="font-display text-lg">?</span>}
                  </div>
                  <div className="mt-2 min-h-[2rem] text-center font-sticker text-[10px] tracking-[0.1em]">
                    {b ? (b.booker_name ?? "BOOKED") : "OPEN"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="font-display text-base">{tier.nextLine}</div>
            <div className="relative mt-4 h-3 border-[2px] border-mm-black bg-mm-bone">
              <div className="absolute inset-y-0 left-0 bg-mm-pink" style={{ width: `${tier.progress}%` }} />
              {[
                { pos: 50, label: "50% OFF", unlocked: count >= 4 },
                { pos: 100, label: "FREE TRIP", unlocked: count >= 8 },
              ].map((m) => (
                <div key={m.label} className="absolute -top-1 -translate-x-1/2" style={{ left: `${m.pos}%` }}>
                  <div
                    className={`h-5 w-5 border-[2px] border-mm-black ${
                      m.unlocked ? "bg-mm-pink" : "bg-mm-paper"
                    }`}
                  />
                  <div
                    className={`mt-2 whitespace-nowrap font-sticker text-[10px] tracking-[0.12em] ${
                      m.unlocked ? "text-mm-pink" : "text-mm-black/60"
                    }`}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bookings */}
      <section className="px-5 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-5xl">
          <h3 className="font-display text-2xl">RECENT BOOKINGS</h3>
          <div className="mt-4 overflow-hidden border-mm-thick bg-mm-bone shadow-mm-sm">
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-sm text-mm-black/60">
                No bookings yet — share your code to get the squad rolling.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-mm-paper text-left">
                  <tr>
                    {["Name", "Trip", "Departure", "Booked"].map((h) => (
                      <th key={h} className="px-4 py-3 font-sticker text-[10px] tracking-[0.15em]">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t-[2px] border-mm-black/10">
                      <td className="px-4 py-3 font-display">{b.booker_name ?? "—"}</td>
                      <td className="px-4 py-3 capitalize text-mm-black/70">{b.trip_slug ?? "—"}</td>
                      <td className="px-4 py-3">{b.departure_date ?? "—"}</td>
                      <td className="px-4 py-3 text-mm-black/60">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {shareOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-mm-black/70 p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md border-mm-thick bg-mm-paper p-6 shadow-mm-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">SHARE YOUR CODE</h3>
              <button onClick={() => setShareOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 border-[2px] border-mm-black bg-mm-bone p-4 text-sm">
              "Booking my Mad Monkey trip — use my code <strong>{code}</strong> at checkout to join my squad. 🌴"
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                className="border-[3px] border-mm-black bg-mm-lime py-2 text-center font-display text-xs text-mm-black"
                href={`https://wa.me/?text=${encodeURIComponent(`Booking my Mad Monkey trip — use my code ${code} at checkout. 🌴`)}`}
                target="_blank" rel="noreferrer"
              >
                WHATSAPP
              </a>
              <button
                onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="border-[3px] border-mm-black bg-mm-orange py-2 text-center font-display text-xs text-mm-black"
              >
                COPY CODE
              </button>
              <button
                onClick={() => navigator.share?.({ text: `Use my Mad Monkey code ${code} at checkout 🌴` }).catch(() => {})}
                className="border-[3px] border-mm-black bg-mm-pink py-2 text-center font-display text-xs text-mm-bone"
              >
                SHARE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
