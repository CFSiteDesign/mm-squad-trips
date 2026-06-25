import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Lock } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { getSquadAdmin, setStudentLeaderStatus, type SquadAdminData } from "@/lib/squad";
import { getAdminToken } from "@/lib/admin";

// Module-level cache persists across view switches (mount/unmount)
let squadCache: SquadAdminData | null = null;

export function clearSquadCache() {
  squadCache = null;
}

type FilterKey = "all" | "students" | "pending";

export default function SquadAdmin({ refreshKey }: { refreshKey?: number }) {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<SquadAdminData | null>(squadCache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const adminToken = getAdminToken();

  async function reload() {
    if (!adminToken) return;
    try {
      const d = await getSquadAdmin({ token: adminToken });
      squadCache = d;
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    }
  }

  useEffect(() => {
    if (!adminToken || squadCache) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await getSquadAdmin({ token: adminToken });
        if (!cancelled) {
          squadCache = d;
          setData(d);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminToken, refreshKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const d = await getSquadAdmin({ password });
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: string, action: "approve" | "reject") {
    if (!adminToken) return;
    setBusyId(id);
    try {
      await setStudentLeaderStatus({ token: adminToken, id, action });
      toast.success(action === "approve" ? "Approved — welcome email sent" : "Application rejected");
      squadCache = null;
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!data && adminToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-mm-paper p-6 text-mm-black">
        <div className="font-sticker text-[11px] tracking-[0.15em] text-mm-black/60">
          {error ? error : "LOADING…"}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-mm-paper p-6 text-mm-black">
        <form onSubmit={submit} className="w-full max-w-sm border-mm-thick bg-mm-bone p-6 shadow-mm">
          <Sticker color="pink" rotate={-3}>ADMIN</Sticker>
          <h1 className="mt-3 font-display text-2xl">SQUAD LEADER ADMIN</h1>
          <p className="mt-2 text-sm text-mm-black/70">Enter the admin password to view all squad codes and bookings.</p>
          <label className="mt-5 block font-sticker text-[10px] tracking-[0.15em]">PASSWORD</label>
          <div className="mt-1 flex items-center gap-2 border-[3px] border-mm-black bg-mm-paper px-3">
            <Lock className="h-4 w-4 text-mm-black/50" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3 text-sm outline-none"
              autoFocus
            />
          </div>
          {error && <p className="mt-3 text-sm text-mm-pink">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full border-[3px] border-mm-black bg-mm-pink py-3 font-display text-mm-bone shadow-mm-sm disabled:opacity-60"
          >
            {loading ? "CHECKING…" : "UNLOCK"}
          </button>
          <Link to="/squad-leader" className="mt-4 block text-center font-sticker text-[10px] tracking-[0.15em] text-mm-black/60">
            ← BACK TO HUB
          </Link>
        </form>
      </main>
    );
  }

  const { leaders, stats } = data;
  const filtered = leaders.filter((l) => {
    if (filter === "students") return l.isStudent;
    if (filter === "pending") return l.isStudent && l.status === "pending";
    return true;
  });

  return (
    <main className="min-h-screen bg-mm-paper text-mm-black">
      <section className="bg-mm-black px-5 py-12 text-mm-bone md:px-8">
        <div className="mx-auto max-w-6xl">
          <Sticker color="lime" rotate={-3}>ADMIN OVERVIEW</Sticker>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">SQUAD LEADERS</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "LEADERS", value: stats.totalLeaders },
              { label: "AT 50% OFF", value: stats.unlockedHalf },
              { label: "FREE TRIP", value: stats.unlockedFree },
              { label: "PENDING STUDENTS", value: stats.pendingStudents ?? 0 },
            ].map((s) => (
              <div key={s.label} className="border-[3px] border-mm-bone bg-mm-bone/10 p-4">
                <div className="font-sticker text-[10px] tracking-[0.15em] text-mm-bone/70">{s.label}</div>
                <div className="mt-1 font-display text-3xl">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
          {([
            { k: "all", l: "All" },
            { k: "students", l: "Students" },
            { k: "pending", l: "Pending student applications" },
          ] as { k: FilterKey; l: string }[]).map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`border-[3px] border-mm-black px-4 py-2 font-sticker text-[10px] tracking-[0.15em] ${
                filter === f.k ? "bg-mm-pink text-mm-bone shadow-mm-sm" : "bg-mm-bone"
              }`}
            >
              {f.l.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pb-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {filtered.length === 0 ? (
            <div className="border-mm-thick bg-mm-bone p-8 text-center text-sm text-mm-black/70 shadow-mm-sm">
              No leaders to show.
            </div>
          ) : (
            <div className="overflow-x-auto border-mm-thick bg-mm-bone shadow-mm">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-mm-paper text-left">
                  <tr>
                    {["Code", "Leader", "Contact", "Type / Status", "Trip / Month", "Group", "Tier", ""].map((h) => (
                      <th key={h} className="px-3 py-3 font-sticker text-[10px] tracking-[0.15em]">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const open = expanded === l.id;
                    const isPending = l.isStudent && l.status === "pending";
                    const dashUrl = `/squad-leader/dashboard?token=${l.accessToken}`;
                    const goal = l.isStudent ? 10 : 8;
                    return (
                      <Fragment key={l.id}>
                        <tr className="border-t-[2px] border-mm-black/10 align-top">
                          <td className="px-3 py-3 font-display tracking-[0.08em]">{isPending ? "—" : l.code}</td>
                          <td className="px-3 py-3">
                            <div className="font-display">{l.name}</div>
                            {l.instagram && (
                              <div className="text-xs text-mm-black/60">@{l.instagram.replace(/^@/, "")}</div>
                            )}
                            {l.isStudent && (
                              <div className="text-xs text-mm-black/60">
                                {l.university}{l.society ? ` · ${l.society}` : ""}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div>{l.email}</div>
                            <div className="text-mm-black/60">{l.phone}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              {l.isStudent && (
                                <span className="inline-flex w-fit items-center border-[2px] border-mm-black bg-mm-lime px-2 py-0.5 font-sticker text-[10px] tracking-[0.12em]">
                                  STUDENT
                                </span>
                              )}
                              <span
                                className={`inline-flex w-fit items-center border-[2px] border-mm-black px-2 py-0.5 font-sticker text-[10px] tracking-[0.12em] ${
                                  l.status === "pending"
                                    ? "bg-mm-orange"
                                    : l.status === "rejected"
                                    ? "bg-mm-black text-mm-bone"
                                    : "bg-mm-paper"
                                }`}
                              >
                                {l.status.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs capitalize">
                            <div>{l.preferredTripSlug ?? "—"}</div>
                            <div className="text-mm-black/60">{l.preferredMonth ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center border-[2px] border-mm-black bg-mm-lime px-2 py-1 font-display text-xs">
                              {l.count}/{goal}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center border-[2px] border-mm-black px-2 py-1 font-display text-xs ${
                                l.tier === "FREE TRIP" || l.tier === "2 FREE SPOTS"
                                  ? "bg-mm-pink text-mm-bone"
                                  : l.tier === "50% OFF"
                                  ? "bg-mm-orange"
                                  : "bg-mm-paper text-mm-black/60"
                              }`}
                            >
                              {l.tier}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => moderate(l.id, "approve")}
                                    disabled={busyId === l.id}
                                    className="border-[2px] border-mm-black bg-mm-lime px-2 py-1 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60"
                                  >
                                    APPROVE
                                  </button>
                                  <button
                                    onClick={() => moderate(l.id, "reject")}
                                    disabled={busyId === l.id}
                                    className="border-[2px] border-mm-black bg-mm-paper px-2 py-1 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60"
                                  >
                                    REJECT
                                  </button>
                                </>
                              ) : (
                                <a
                                  href={dashUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 border-[2px] border-mm-black bg-mm-bone px-2 py-1 font-sticker text-[10px] tracking-[0.15em]"
                                >
                                  DASH <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <button
                                onClick={() => setExpanded(open ? null : l.id)}
                                className="border-[2px] border-mm-black bg-mm-paper px-2 py-1 font-sticker text-[10px] tracking-[0.15em]"
                              >
                                {open ? "HIDE" : "DETAILS"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-t-[2px] border-mm-black/10 bg-mm-paper">
                            <td colSpan={8} className="px-4 py-4">
                              {l.reason && (
                                <div className="mb-4">
                                  <div className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/60">WHY THEY APPLIED</div>
                                  <p className="mt-1 text-sm">{l.reason}</p>
                                </div>
                              )}
                              <div className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/60">
                                BOOKINGS ({l.bookings.length})
                              </div>
                              {l.bookings.length === 0 ? (
                                <p className="mt-2 text-sm text-mm-black/60">No bookings yet.</p>
                              ) : (
                                <table className="mt-2 w-full text-xs">
                                  <thead className="text-left">
                                    <tr>
                                      {["Name", "Email", "Trip", "Departure", "Booked"].map((h) => (
                                        <th key={h} className="px-2 py-1 font-sticker tracking-[0.12em] text-mm-black/60">
                                          {h.toUpperCase()}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {l.bookings.map((b) => (
                                      <tr key={b.id} className="border-t border-mm-black/10">
                                        <td className="px-2 py-1">{b.booker_name ?? "—"}</td>
                                        <td className="px-2 py-1">{b.booker_email ?? "—"}</td>
                                        <td className="px-2 py-1 capitalize">{b.trip_slug ?? "—"}</td>
                                        <td className="px-2 py-1">{b.departure_date ?? "—"}</td>
                                        <td className="px-2 py-1 text-mm-black/60">
                                          {new Date(b.created_at).toLocaleDateString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
