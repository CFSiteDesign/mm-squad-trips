import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken, isAdminPreview } from "@/lib/admin";
import { publicUrl } from "@/lib/base-path";

// Admin > Trip builder (19 Oct 2026). Trips sent from Ewan's builder at
// /trip-builder with a $50 per person deposit. The crew checks each one, then
// sends the balance link (guest gets the "ready" email) or declines it and
// refunds the deposit. Backend: trip-builder-admin.

type Req = {
  ref: string; status: string; name: string; contact_via: string | null; email: string | null; whatsapp: string | null;
  guest_email: string | null; from_place: string | null; party_size: number; dates_flex: string | null; start_date: string | null;
  route: string | null; days: number | null; est_total_usd: number | null; all_in_match: string | null; trip_link: string | null;
  itinerary: string | null; notes: string | null; campaign_ref: string | null; from_hostel: string | null;
  deposit_amount: number; deposit_paid_at: string | null; hold_until: string | null; balance_amount: number | null;
  balance_url: string | null; balance_paid_at: string | null; refunded_at: string | null; crew_note: string | null; created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "UNPAID", cls: "bg-mm-paper text-mm-black/60" },
  submitted: { label: "NEW", cls: "bg-mm-pink text-mm-bone" },
  checking: { label: "CHECKING", cls: "bg-mm-orange" },
  ready: { label: "BALANCE SENT", cls: "bg-mm-yellow" },
  approved: { label: "BOOKED", cls: "bg-mm-lime" },
  declined: { label: "DECLINED", cls: "bg-mm-black text-mm-bone" },
};
type Filter = "active" | "booked" | "declined" | "unpaid" | "all";
const FILTERS: { k: Filter; l: string; match: (r: Req) => boolean }[] = [
  { k: "active", l: "To do", match: (r) => ["submitted", "checking", "ready"].includes(r.status) },
  { k: "booked", l: "Booked", match: (r) => r.status === "approved" },
  { k: "declined", l: "Declined", match: (r) => r.status === "declined" },
  { k: "unpaid", l: "Unpaid", match: (r) => r.status === "pending_payment" },
  { k: "all", l: "All", match: () => true },
];
const usd = (n: number | null | undefined) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

async function call(body: Record<string, unknown>) {
  if (isAdminPreview()) throw new Error("Preview mode is read-only. Log in at /admin to make changes.");
  const { data, error } = await supabase.functions.invoke("trip-builder-admin", {
    body,
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const b = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
    throw new Error(b?.error || error.message);
  }
  if (!data?.ok) throw new Error(data?.error || "Action failed");
  return data;
}

export default function TripBuilderAdmin({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  async function load() {
    if (isAdminPreview()) { setRows([]); return; }
    try {
      const d = await call({ action: "list" });
      setRows(d.requests as Req[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }
  useEffect(() => { load(); }, [refreshKey]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.k, (rows ?? []).filter(f.match).length])), [rows]);
  const shown = (rows ?? []).filter(FILTERS.find((f) => f.k === filter)!.match);

  async function act(r: Req, action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(r.ref);
    try {
      const d = await call({ action, ref: r.ref, note: notes[r.ref] ?? r.crew_note ?? "", ...extra });
      toast.success(
        action === "balance" ? (d.emailed ? "Balance link sent to the guest" : "Balance link made (no email on file: copy it below)")
        : action === "decline" ? (d.refunded ? `Declined, ${usd(d.refunded)} refunded` : "Declined")
        : "Saved",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  // The same review page the new-trip email links to: the whole trip as the guest built it, with Approve / Not approved / Edit it.
  async function openReview(r: Req) {
    const w = window.open("about:blank", "_blank"); // opened first so the browser doesn't treat it as a pop-up
    try {
      const d = await call({ action: "link", ref: r.ref });
      if (w) w.location.href = d.url as string; else window.location.href = d.url as string;
    } catch (e) {
      w?.close();
      toast.error(e instanceof Error ? e.message : "Couldn't open the review page");
    }
  }

  if (!rows) {
    return <div className="p-8 text-center font-sticker text-[11px] tracking-[0.15em] text-mm-black/60">{error ?? "LOADING…"}</div>;
  }

  return (
    <div>
      <section className="mb-4 border-mm-thick bg-mm-black p-5 text-mm-bone">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-sticker text-[10px] tracking-[0.15em] text-mm-lime">TRIP BUILDER</div>
            <h2 className="mt-1 font-display text-3xl">CUSTOM TRIPS</h2>
            <p className="mt-1 max-w-2xl text-sm text-mm-bone/80">
              Trips guests built in the trip builder, each with a $50 per person deposit. Check the plan, then send the balance link, or decline it and refund the deposit.
            </p>
          </div>
          <a href={publicUrl("trip-builder/")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border-[2px] border-mm-bone px-3 py-1.5 font-sticker text-[10px] tracking-[0.15em]">
            OPEN THE BUILDER <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`border-[3px] border-mm-black px-3 py-1.5 font-sticker text-[10px] tracking-[0.15em] ${filter === f.k ? "bg-mm-pink text-mm-bone shadow-mm-sm" : "bg-mm-bone"}`}>
            {f.l.toUpperCase()} ({counts[f.k] ?? 0})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="border-mm-thick bg-mm-bone p-8 text-center text-sm text-mm-black/60 shadow-mm-sm">Nothing here.</div>
      ) : (
        <div className="overflow-x-auto border-mm-thick bg-mm-bone shadow-mm">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-mm-paper text-left">
              <tr>{["Ref", "Guest", "Trip", "People", "Deposit", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-3 font-sticker text-[10px] tracking-[0.15em]">{h.toUpperCase()}</th>
              ))}</tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isOpen = open === r.ref;
                const st = STATUS[r.status] ?? STATUS.submitted;
                // No guess: the builder's estimate includes the guest's own spending money, so the crew sets the real balance.
                const balanceGuess = "";
                return (
                  <Fragment key={r.ref}>
                    <tr className="border-t-[2px] border-mm-black/10 align-top">
                      <td className="px-3 py-3 font-display tracking-[0.06em]">{r.ref}<div className="text-[11px] font-sans text-mm-black/50">{day(r.created_at)}</div></td>
                      <td className="px-3 py-3"><div className="font-display">{r.name}</div>
                        <div className="text-xs text-mm-black/70">{r.contact_via === "whatsapp" ? `WhatsApp ${r.whatsapp ?? ""}` : r.email}</div>
                        {r.guest_email && r.guest_email !== r.email && <div className="text-xs text-mm-black/50">Receipts: {r.guest_email}</div>}</td>
                      <td className="px-3 py-3"><div>{r.route}</div><div className="text-xs text-mm-black/60">{r.days} days · {r.start_date ? `from ${day(r.start_date)}` : "no date yet"}{r.dates_flex ? ` · ${r.dates_flex}` : ""}</div></td>
                      <td className="px-3 py-3">{r.party_size}</td>
                      <td className="px-3 py-3">{usd(r.deposit_amount)}<div className="text-xs text-mm-black/60">{r.refunded_at ? "refunded" : r.deposit_paid_at ? "paid" : "not paid"}</div></td>
                      <td className="px-3 py-3"><span className={`inline-flex border-[2px] border-mm-black px-2 py-0.5 font-sticker text-[10px] tracking-[0.12em] ${st.cls}`}>{st.label}</span>
                        {r.status === "ready" && r.balance_amount != null && <div className="mt-1 text-xs">{usd(r.balance_amount)} to pay</div>}
                        {r.hold_until && ["submitted", "checking"].includes(r.status) && <div className="mt-1 text-xs text-mm-black/60">beds held to {day(r.hold_until)}</div>}</td>
                      <td className="px-3 py-3"><button onClick={() => setOpen(isOpen ? null : r.ref)} className="border-[2px] border-mm-black bg-mm-paper px-2 py-1 font-sticker text-[10px] tracking-[0.15em]">{isOpen ? "HIDE" : "OPEN"}</button></td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t-[2px] border-mm-black/10 bg-mm-paper">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {["submitted", "checking", "ready"].includes(r.status) && (
                                  <button onClick={() => openReview(r)} className="inline-flex items-center gap-1 border-[2px] border-mm-black bg-mm-lime px-2 py-1 font-sticker text-[10px] tracking-[0.15em]">
                                    REVIEW PAGE: APPROVE / DECLINE / EDIT <ExternalLink className="h-3 w-3" />
                                  </button>
                                )}
                                {r.trip_link && <a href={r.trip_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border-[2px] border-mm-black bg-mm-bone px-2 py-1 font-sticker text-[10px] tracking-[0.15em]">OPEN THEIR TRIP <ExternalLink className="h-3 w-3" /></a>}
                                <span className="text-xs text-mm-black/70 self-center">
                                  Builder estimate {usd(r.est_total_usd)} per person, incl. their spending money{r.all_in_match ? ` · looks like ALL IN ${r.all_in_match}` : ""}{r.from_place ? ` · now in ${r.from_place}` : ""}{r.campaign_ref ? ` · ref ${r.campaign_ref}` : ""}{r.from_hostel ? ` · QR at ${r.from_hostel}` : ""}
                                </span>
                              </div>
                              {r.notes && <p className="mt-3 text-sm"><b>Their note:</b> {r.notes}</p>}
                              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap border-[2px] border-mm-black bg-mm-bone p-3 font-mono text-[11px] leading-relaxed">{r.itinerary || "No itinerary text."}</pre>
                            </div>
                            <div className="space-y-3">
                              <label className="block">
                                <span className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/60">NOTE TO THE GUEST (SHOWN ON THEIR PAGE AND IN EMAILS)</span>
                                <textarea value={notes[r.ref] ?? r.crew_note ?? ""} onChange={(e) => setNotes((m) => ({ ...m, [r.ref]: e.target.value }))}
                                  rows={4} className="mt-1 w-full border-[2px] border-mm-black bg-mm-bone p-2 text-sm" placeholder="e.g. All checked. We swapped the Pai night bus for a day minivan so you arrive in daylight." />
                              </label>
                              {r.status === "pending_payment" && <p className="text-xs text-mm-black/60">Deposit not paid, so there's nothing to action yet.</p>}
                              {["submitted", "checking", "ready"].includes(r.status) && (
                                <>
                                  {r.status === "submitted" && (
                                    <button disabled={busy === r.ref} onClick={() => act(r, "checking")} className="w-full border-[2px] border-mm-black bg-mm-orange px-3 py-2 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60">I'M CHECKING IT</button>
                                  )}
                                  <div className="border-[2px] border-mm-black bg-mm-bone p-3">
                                    <span className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/60">BALANCE TO PAY (USD, DEPOSIT ALREADY TAKEN OFF)</span>
                                    <div className="mt-1 flex gap-2">
                                      <input type="number" min={1} step="0.01" value={amounts[r.ref] ?? String(r.balance_amount ?? balanceGuess)}
                                        onChange={(e) => setAmounts((m) => ({ ...m, [r.ref]: e.target.value }))} className="w-32 border-[2px] border-mm-black bg-mm-paper px-2 py-1 text-sm" />
                                      <button disabled={busy === r.ref} onClick={() => act(r, "balance", { amount: Number(amounts[r.ref] ?? r.balance_amount ?? balanceGuess) },
                                        `Send ${r.name} a payment link for $${amounts[r.ref] ?? r.balance_amount ?? balanceGuess}?`)}
                                        className="flex-1 border-[2px] border-mm-black bg-mm-lime px-2 py-1 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60">{r.status === "ready" ? "SEND A NEW LINK" : "SEND BALANCE LINK"}</button>
                                    </div>
                                    {r.balance_url && <button onClick={() => navigator.clipboard.writeText(r.balance_url!).then(() => toast.success("Copied"))} className="mt-2 text-xs underline">Copy the current balance link</button>}
                                  </div>
                                  <button disabled={busy === r.ref} onClick={() => act(r, "decline", { refund: true }, `Decline ${r.ref} and refund the ${usd(r.deposit_amount)} deposit to ${r.name}?`)}
                                    className="w-full border-[2px] border-mm-black bg-mm-paper px-3 py-2 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60">CAN'T DO IT: DECLINE + REFUND DEPOSIT</button>
                                  <button disabled={busy === r.ref} onClick={() => act(r, "booked", {}, `Mark ${r.ref} as booked without taking the balance here?`)}
                                    className="w-full px-3 py-1 text-xs underline disabled:opacity-60">Paid another way: mark as booked</button>
                                </>
                              )}
                              <button disabled={busy === r.ref} onClick={() => act(r, "note")} className="w-full border-[2px] border-mm-black bg-mm-bone px-3 py-1.5 font-sticker text-[10px] tracking-[0.15em] disabled:opacity-60">SAVE NOTE ONLY</button>
                            </div>
                          </div>
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
  );
}
