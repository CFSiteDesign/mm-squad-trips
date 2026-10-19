// One guest's journey, opened from a row on the Bookings tab ("journey").
// Same steps as the Guest journeys overview, but for this booking: what has
// gone out (email log + booking stamps), what's next and when, and what was
// skipped and why. "View email" fills the real template with this guest.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { adminApi } from "@/lib/admin";
import { journeyEmails, type GuestEmailData, type RenderedEmail } from "@/components/admin/journey-emails";
import { OPS_RECIPIENTS, ViewEmailButton, useEmailPreview } from "@/components/admin/GuestJourneys";

type Row = Record<string, unknown>;
type State = "done" | "upcoming" | "skipped" | "failed" | "info";
type Item = { label: string; state: State; detail: string; to?: string; render?: () => Promise<RenderedEmail> };
type Step = { when: string; date?: string; items: Item[] };

const STATE: Record<State, { text: string; cls: string }> = {
  done: { text: "DONE", cls: "bg-mm-lime" },
  upcoming: { text: "COMING UP", cls: "bg-mm-paper" },
  skipped: { text: "SKIPPED", cls: "bg-mm-bone text-mm-black/60" },
  failed: { text: "NEEDS A LOOK", cls: "bg-mm-orange" },
  info: { text: "INFO", cls: "bg-mm-yellow" },
};

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0) || 0;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
const dateLabel = (iso: string) => iso ? new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
const when = (iso: string) => iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// Loaded once per admin session; the journey only reads.
const cache: { trips?: Row[]; departures?: Row[]; emails?: Row[] } = {};
async function load() {
  const [trips, departures, emails] = await Promise.all([
    cache.trips ?? adminApi.list("trips", { limit: 1000 }),
    cache.departures ?? adminApi.list("departures", { limit: 1000 }),
    cache.emails ?? adminApi.list("email_send_log", { orderBy: "created_at", ascending: false, limit: 1000 }),
  ]);
  Object.assign(cache, { trips, departures, emails });
  return { trips, departures, emails };
}

export function BookingJourney({ lead, allBookings, onClose }: { lead: Row; allBookings: Row[]; onClose: () => void }) {
  const [data, setData] = useState<{ trips: Row[]; departures: Row[]; emails: Row[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { show, modal, error } = useEmailPreview();

  useEffect(() => {
    load().then(setData).catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data) {
    return (
      <Shell onClose={onClose} title={str(lead.lead_name) || "Booking"}>
        <p className="p-5 text-sm text-mm-black/70">{loadError ? `Couldn't load: ${loadError}` : "Loading this guest's journey…"}</p>
      </Shell>
    );
  }

  const trip = data.trips.find((t) => t.id === lead.trip_id) ?? {};
  const dep = data.departures.find((d) => d.id === lead.departure_id) ?? {};
  const depDate = str(dep.departure_date).slice(0, 10);
  const today = ymd(new Date());
  const daysOut = depDate ? daysBetween(today, depDate) : 0;
  const spots = num(lead.group_size) || 1;
  const crew = lead.lead_solo === false || (lead.lead_solo == null && spots > 1);
  const cancelled = str(lead.status) === "Cancelled";
  // One row per spot in real data; lead rows carry group_size, so count spots off leads.
  const travellers = allBookings
    .filter((b) => b.departure_id === lead.departure_id && str(b.status) === "Confirmed" && num(b.spot_number || 1) === 1)
    .reduce((n, b) => n + (num(b.group_size) || 1), 0);
  const email = str(lead.lead_email).toLowerCase();
  const mine = data.emails.filter((e) => str(e.recipient_email).toLowerCase().includes(email) && email);
  const sent = (templates: string[]) => mine.find((e) => templates.includes(str(e.template_name)));
  const logged = (e: Row | undefined, fallback: string): Pick<Item, "state" | "detail"> =>
    e ? { state: str(e.status) === "failed" ? "failed" : "done", detail: `${str(e.status) === "failed" ? "Failed" : "Sent"} ${when(str(e.created_at))}${e.error_message ? `: ${str(e.error_message)}` : ""}` }
      : { state: "info", detail: fallback };

  const slug = str(trip.slug);
  const country = slug.split("-")[0].replace(/^./, (c) => c.toUpperCase());
  const perSpotFinal = num(lead.final_price);
  const total = perSpotFinal * spots;
  const paid = num(lead.amount_paid) * spots;
  const balance = num(lead.balance_amount) * spots || Math.max(0, total - paid);
  const deposit = str(lead.payment_type) === "Deposit";
  const dueIso = str(lead.balance_due_date).slice(0, 10) || (depDate ? plusDays(depDate, -7) : "");
  const g: GuestEmailData = {
    first: str(lead.lead_name).split(/\s+/)[0] || "there", name: str(lead.lead_name), email: str(lead.lead_email), phone: str(lead.lead_phone),
    tripName: str(trip.name) || country, shortTrip: num(trip.days) ? `${num(trip.days)}-day ${country}` : country, country, slug,
    date: dateLabel(depDate), dueDate: dateLabel(dueIso), ref: str(lead.booking_ref),
    bookingUrl: "https://madmonkeyhostels.com/all-in-trips/booking-success", spots, crew,
    paidToday: paid, balance, total, hasBalance: deposit,
  };
  const ifCancelled = (item: Item): Item => (cancelled && item.state === "upcoming" ? { ...item, state: "skipped", detail: "Booking cancelled" } : item);

  const opsLog = data.emails.find((e) => str(e.template_name) === "booking_ops_notification" && str(e.subject).includes(str(lead.lead_name)));
  const steps: Step[] = [
    {
      when: "At booking",
      date: when(str(lead.created_at)),
      items: [
        { label: "Booking confirmed", to: "Guest", ...logged(sent(["booking_confirmed", "solo_booking_confirmed", "booking_confirmation", "backfill_booking_confirmation"]), "Not in the email log (older or admin-added booking)"), render: () => journeyEmails.confirmation(g) },
        { label: "New booking alert", to: OPS_RECIPIENTS, ...logged(opsLog, "Not found in the email log"), render: () => journeyEmails.opsAlert(g) },
        lead.klaviyo_last_error
          ? { label: "Klaviyo", state: "failed", detail: str(lead.klaviyo_last_error) }
          : lead.klaviyo_synced_at
            ? { label: "Klaviyo", state: "done", detail: `Synced ${when(str(lead.klaviyo_synced_at))}` }
            : { label: "Klaviyo", state: "upcoming", detail: "Not synced yet (runs every 15 minutes)" },
        lead.whatsapp_opt_in
          ? { label: "WhatsApp trip updates", state: "done", detail: `Opted in ${when(str(lead.whatsapp_opt_in_at))}` }
          : { label: "WhatsApp trip updates", state: "info", detail: "Didn't tick the box, so no WhatsApp" },
      ],
    },
  ];

  if (crew) {
    const headsUp = str(lead.underfill_notice_sent_at);
    const headsUpDate = depDate ? plusDays(depDate, -10) : "";
    const item: Item = headsUp
      ? { label: "Heads-up: under 5, still going ahead", state: "done", detail: `Sent ${when(headsUp)}` }
      : travellers >= 5
        ? { label: "Heads-up: under 5, still going ahead", state: "skipped", detail: `Not needed: ${travellers} travellers booked` }
        : daysOut > 10
          ? { label: "Heads-up: under 5, still going ahead", state: "upcoming", detail: `${dateLabel(headsUpDate)}, only if still under 5 (${travellers} booked now)` }
          : daysOut >= 8
            ? { label: "Heads-up: under 5, still going ahead", state: "upcoming", detail: "Goes out at the next morning run" }
            : { label: "Heads-up: under 5, still going ahead", state: "failed", detail: "Not sent: booked inside 8 days. Planned fix: send straight after booking." };
    steps.push({
      when: "10 days before",
      date: dateLabel(headsUpDate),
      items: [
        { label: "Travellers on this departure", state: travellers >= 5 ? "done" : "info", detail: travellers >= 5 ? `${travellers} booked (5 or more)` : `${travellers} of 5 booked so far. It runs either way.` },
        ifCancelled({ ...item, to: "Guest (lead booker)", render: () => journeyEmails.headsUp(g) }),
      ],
    });
  }

  const bs = str(lead.balance_status);
  const balanceItem: Item =
    bs === "not_required" || !deposit ? { label: "Balance", state: "skipped", detail: "Paid in full at booking" }
    : bs === "charged" ? { label: "Balance charged", to: "Guest", ...logged(sent(["balance_paid"]), "Charged"), render: () => journeyEmails.balancePaid(g) }
    : bs === "failed" ? { label: "Balance failed, retrying every 2 days", to: "Guest", state: "failed", detail: logged(sent(["balance_failed"]), "Card declined").detail, render: () => journeyEmails.balanceFailed(g) }
    : bs === "failed_final" ? { label: "Balance failed for good", to: "Guest", state: "failed", detail: "Automatic retries stopped. Needs chasing.", render: () => journeyEmails.balanceFailed(g) }
    : bs === "cancelled" ? { label: "Balance", state: "skipped", detail: "Booking cancelled" }
    : bs === "manual" ? { label: "Balance", state: "info", detail: "Handled manually" }
    : { label: "Balance auto-charge", state: "upcoming", detail: `${dateLabel(dueIso)}: ${balance ? `$${balance.toFixed(2)} USD` : "remaining balance"}`, to: "Guest", render: () => journeyEmails.balancePaid(g) };
  steps.push({ when: "7 days before", date: dateLabel(dueIso), items: [ifCancelled(balanceItem)] });

  // departure-team-reminders adds the Hanoi and Hoi An travel desks for Vietnam only.
  const TEAM_RECIPIENTS = slug.startsWith("vietnam") ? "reception@ + trip GMs + Hanoi & Hoi An travel desks" : "reception@ + trip GMs";
  const team = (key: string, days: 7 | 1): Item => {
    const at = str(dep[key]);
    return ifCancelled(at
      ? { label: `Property manifest (${days === 7 ? "7 days" : "1 day"})`, state: "done", detail: `Sent ${when(at)}`, to: TEAM_RECIPIENTS, render: () => journeyEmails.manifest(g, days, travellers) }
      : daysOut > days
        ? { label: `Property manifest (${days === 7 ? "7 days" : "1 day"})`, state: "upcoming", detail: dateLabel(plusDays(depDate, -days)), to: TEAM_RECIPIENTS, render: () => journeyEmails.manifest(g, days, travellers) }
        : { label: `Property manifest (${days === 7 ? "7 days" : "1 day"})`, state: "info", detail: "Not recorded for this departure", to: TEAM_RECIPIENTS });
  };
  steps.push({ when: "7 days and 1 day before", items: [team("team_reminder_7d_sent_at", 7), team("team_reminder_1d_sent_at", 1)] });

  const finalSent = str(lead.reminder_7d_sent_at);
  const finalLog = sent(["trip_countdown_7d", "balance_reminder_7d"]);
  const payLinkVersion = bs === "failed" || bs === "failed_final";
  steps.push({
    when: "6 to 4 days before",
    date: depDate ? `${dateLabel(plusDays(depDate, -6))} to ${dateLabel(plusDays(depDate, -4))}` : "",
    items: [ifCancelled(
      finalSent
        ? { label: "Final details", state: "done", detail: `Sent ${when(finalSent)}`, to: "Guest", render: () => (finalLog && str(finalLog.template_name) === "balance_reminder_7d" ? journeyEmails.finalPayLink(g) : journeyEmails.finalPaid(g)) }
        : daysOut > 4
          ? { label: payLinkVersion ? "Final details + pay link" : "Final details", state: "upcoming", detail: daysOut > 6 ? `Between ${dateLabel(plusDays(depDate, -6))} and ${dateLabel(plusDays(depDate, -4))}` : "Next daily run (14:00 UTC)", to: "Guest", render: () => (payLinkVersion ? journeyEmails.finalPayLink(g) : journeyEmails.finalPaid(g)) }
          : { label: "Final details", state: daysOut < 0 ? "info" : "failed", detail: daysOut < 0 ? "Trip has started" : "Not sent", to: "Guest" },
    )],
  });
  steps.push({
    when: "Through the trip",
    date: depDate ? `From ${dateLabel(depDate)}` : "",
    items: [{ label: "Day-by-day messages (Klaviyo)", state: "info", detail: lead.whatsapp_opt_in ? "Email + WhatsApp, from Mich's Klaviyo flows" : "Email only (no WhatsApp opt-in), from Mich's Klaviyo flows" }],
  });

  return (
    <Shell onClose={onClose} title={str(lead.lead_name)}>
      <div className="border-b-[3px] border-mm-black bg-mm-bone p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`border-[2px] border-mm-black px-2 py-0.5 font-sticker text-[10px] tracking-[0.12em] text-mm-black ${crew ? "bg-mm-orange" : "bg-mm-lime"}`}>
            {crew ? `WITH A CREW · ${spots} SPOT${spots === 1 ? "" : "S"}` : "INDEPENDENT"}
          </span>
          {cancelled && <span className="border-[2px] border-mm-black bg-mm-pink px-2 py-0.5 font-sticker text-[10px] tracking-[0.12em] text-mm-bone">CANCELLED</span>}
          <span className="text-sm text-mm-black/70">{str(lead.booking_ref)} · {str(lead.lead_email)}</span>
        </div>
        <p className="mt-2 font-display text-lg leading-tight text-mm-black">
          {g.shortTrip} · {dateLabel(depDate)} {depDate && <span className="font-sans text-sm font-normal text-mm-black/60">({daysOut > 0 ? `${daysOut} days to go` : daysOut === 0 ? "departs today" : "departed"})</span>}
        </p>
        <p className="mt-1 text-[13px] text-mm-black/70">
          {deposit ? `Deposit paid, balance ${bs || "scheduled"}` : "Paid in full"} · {travellers} traveller{travellers === 1 ? "" : "s"} on this departure
        </p>
        {error && <p className="mt-2 text-sm text-mm-pink">Couldn't build that preview: {error}</p>}
      </div>
      <ol className="space-y-3 p-4">
        {steps.map((s) => (
          <li key={s.when} className="border-[3px] border-mm-black bg-mm-paper p-3">
            <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">{s.when.toUpperCase()}{s.date ? ` · ${s.date.toUpperCase()}` : ""}</p>
            <ul className="mt-2 space-y-2">
              {s.items.map((it) => (
                <li key={it.label} className="flex flex-wrap items-center gap-2 border-t-[2px] border-mm-black/10 pt-2 first:border-t-0 first:pt-0">
                  <span className={`border-[2px] border-mm-black px-1.5 py-0.5 font-sticker text-[9px] tracking-[0.12em] text-mm-black ${STATE[it.state].cls}`}>{STATE[it.state].text}</span>
                  <span className="text-sm font-bold text-mm-black">{it.label}</span>
                  {it.render && <ViewEmailButton onClick={() => show(it.render!, it.to ?? "Guest")} />}
                  <p className="w-full text-[12px] leading-snug text-mm-black/70">{it.detail}{it.to ? ` · To: ${it.to}` : ""}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {modal}
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-mm-black/50" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l-[3px] border-mm-black bg-mm-paper shadow-mm-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-mm-black bg-mm-black px-4 py-3 text-mm-bone">
          <h2 className="font-display text-xl leading-none">GUEST JOURNEY · {title.toUpperCase()}</h2>
          <button onClick={onClose} aria-label="Close journey" className="text-mm-bone/80 hover:text-mm-bone"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </aside>
    </div>
  );
}
