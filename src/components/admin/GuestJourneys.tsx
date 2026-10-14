// Admin "Guest journeys": every message an ALL IN guest (and the team) gets
// after booking, step by step, for each traveller type. Charlie's 13 Oct 2026
// dashboard meeting: Lexie reviews the wording in context here. Each booking's
// own journey lives on the Bookings tab (BookingJourney.tsx).
//
// The previews are the real templates from supabase/functions/_shared, the
// same code the edge functions send (journey-emails.ts), filled with a sample
// guest. If a template changes, its preview changes with it.
// Plan: docs/journeys/PLAN.md.
import { useState } from "react";
import { Eye, X } from "lucide-react";
import { journeyEmails, type GuestEmailData, type RenderedEmail } from "@/components/admin/journey-emails";

type Status = "live" | "planned" | "decision";
type Message = {
  label: string;
  to: string;
  status: Status;
  note?: string;
  /** Builds the email from the real template; absent for steps owned elsewhere (Klaviyo). */
  render?: () => Promise<RenderedEmail>;
};
type Step = { when: string; title: string; condition?: string; messages: Message[] };

export const OPS_RECIPIENTS = "Ops list (Reden, Adel, Hayley) + trip GMs";
export const TEAM_RECIPIENTS = "reception@ + trip GMs (+ Vietnam travel desks)";

const sample = (crew: boolean): GuestEmailData => ({
  first: "Sam", name: "Sam Taylor", email: "sam@example.com", phone: "+44 7700 900123",
  tripName: "ALL IN Vietnam", shortTrip: "14-day Vietnam", country: "Vietnam", slug: "vietnam",
  date: "Wed, 28 Oct 2026", dueDate: "Wed, 21 Oct 2026", ref: "ALLIN-VIE-0042",
  bookingUrl: "https://madmonkeyhostels.com/all-in-trips/booking-success",
  spots: crew ? 2 : 1, crew, paidToday: crew ? 198 : 99, balance: crew ? 1502 : 751, total: crew ? 1700 : 850, hasBalance: true,
});

function steps(crew: boolean): Step[] {
  const g = sample(crew);
  const atBooking: Step = {
    when: "At booking",
    title: "Books and pays",
    condition: crew
      ? "$99 deposit per spot if 7+ days out, otherwise pay in full. 1 to 5 spots."
      : "$99 deposit if 7+ days out, otherwise pay in full. Always one traveller.",
    messages: [
      {
        label: "Booking confirmed", to: "Guest", status: "live",
        note: crew
          ? "Planned: own crew wording (meeting 13 Oct). Today both routes get this same email."
          : "Planned: slightly different independent wording (meeting 13 Oct). Today both routes get this same email.",
        render: () => journeyEmails.confirmation(g),
      },
      { label: "New booking alert", to: OPS_RECIPIENTS, status: "live", render: () => journeyEmails.opsAlert(g) },
      { label: "Klaviyo: profile + Booking Placed (+ WhatsApp consent if ticked)", to: "Klaviyo", status: "live", note: "Feeds Mich's flows. No guest-facing message." },
    ],
  };
  const crewOnly: Step[] = crew
    ? [
        {
          when: "When the 5th traveller books",
          title: "Milestone only",
          condition: "Every departure runs whatever the numbers, so nothing goes to guests.",
          messages: [{ label: "\"5 travellers booked\" note", to: OPS_RECIPIENTS, status: "live", note: "One line: no action needed." }],
        },
        {
          when: "10 days before",
          title: "Under 5 travellers? Heads-up",
          condition: "Fewer than 5 booked on the departure: send. 5 or more: skipped entirely.",
          messages: [
            {
              label: "Heads-up: still going ahead", to: "Guest (lead booker)", status: "live",
              note: "Today: sent 10 to 8 days out. Planned: straight away if they book when it's already inside 10 days.",
              render: () => journeyEmails.headsUp(g),
            },
            { label: "\"Cancel my booking\" button in the heads-up", to: "Guest", status: "decision", note: "Ideal: cancels and refunds automatically, then tells GMs, Reden, ops and cs@. Fallback: emails cs@ with the booking ref. Waiting on Charlie's call (refund amount, auto vs CS)." },
          ],
        },
      ]
    : [];
  return [
    atBooking,
    ...crewOnly,
    {
      when: "7 days before",
      title: "Balance charged automatically",
      condition: "Deposit bookings only. Paid-in-full guests skip this.",
      messages: [
        { label: "Balance paid", to: "Guest", status: "live", render: () => journeyEmails.balancePaid(g) },
        { label: "Balance failed (retries every 2 days)", to: "Guest", status: "live", render: () => journeyEmails.balanceFailed(g) },
      ],
    },
    {
      when: "7 days and 1 day before",
      title: "Property team manifest",
      messages: [{ label: "Departure manifest", to: TEAM_RECIPIENTS, status: "live", render: () => journeyEmails.manifest(g, 7, g.spots) }],
    },
    {
      when: "6 to 4 days before",
      title: "Final details",
      condition: "Meeting point, free pre-trip night, Day 1, packing, WhatsApp group.",
      messages: [
        { label: "Final details (balance paid)", to: "Guest", status: "live", render: () => journeyEmails.finalPaid(g) },
        { label: "Final details + pay link (charge failed)", to: "Guest", status: "live", render: () => journeyEmails.finalPayLink(g) },
      ],
    },
    {
      when: "Through the trip",
      title: "Day-by-day messages",
      condition: "Built in Klaviyo off the departure date. WhatsApp only to guests who ticked the box at checkout.",
      messages: [{ label: "Klaviyo / WhatsApp flows", to: "Guest", status: "live", note: "Owned by Mich in Klaviyo, so no preview here." }],
    },
  ];
}

const STATUS: Record<Status, { text: string; cls: string }> = {
  live: { text: "LIVE", cls: "bg-mm-lime" },
  planned: { text: "PLANNED", cls: "bg-mm-yellow" },
  decision: { text: "DECISION NEEDED", cls: "bg-mm-orange" },
};

export function ViewEmailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto inline-flex items-center gap-1 border-[2px] border-mm-black bg-mm-paper px-2 py-1 font-sticker text-[9px] tracking-[0.12em] text-mm-black hover:bg-mm-yellow"
    >
      <Eye className="h-3.5 w-3.5" /> VIEW EMAIL
    </button>
  );
}

/** The real email in a sandboxed frame, subject and recipient on top. */
export function EmailPreviewModal({ email, to, onClose }: { email: RenderedEmail; to: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-mm-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col border-[3px] border-mm-black bg-mm-paper shadow-mm-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b-[3px] border-mm-black p-4">
          <div className="min-w-0">
            <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/55">SUBJECT</p>
            <p className="mt-1 break-words text-base font-bold normal-case leading-tight text-mm-black">{email.subject}</p>
            <p className="mt-1 text-[12px] text-mm-black/60">To: {to}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 text-mm-black/60 hover:text-mm-black">
            <X className="h-5 w-5" />
          </button>
        </div>
        <iframe title="Email preview" srcDoc={email.html} sandbox="" className="h-[70vh] w-full bg-white" />
      </div>
    </div>
  );
}

/** Open a rendered email; shared by the overview and the per-booking journey. */
export function useEmailPreview() {
  const [open, setOpen] = useState<{ email: RenderedEmail; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const show = async (render: () => Promise<RenderedEmail>, to: string) => {
    setError(null);
    try {
      setOpen({ email: await render(), to });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const modal = open ? <EmailPreviewModal email={open.email} to={open.to} onClose={() => setOpen(null)} /> : null;
  return { show, modal, error };
}

function Lane({ title, sub, steps: list, onOpen }: { title: string; sub: string; steps: Step[]; onOpen: (m: Message) => void }) {
  return (
    <section className="min-w-0 flex-1">
      <div className="border-[3px] border-mm-black bg-mm-black p-4 text-mm-bone">
        <h3 className="font-display text-2xl leading-none">{title}</h3>
        <p className="mt-1 text-sm text-mm-bone/75">{sub}</p>
      </div>
      <ol className="relative mt-4 space-y-4 border-l-[3px] border-mm-black pl-5">
        {list.map((step) => (
          <li key={step.when + step.title} className="relative">
            <span className="absolute -left-[31px] top-3 h-4 w-4 border-[3px] border-mm-black bg-mm-pink" aria-hidden />
            <p className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">{step.when.toUpperCase()}</p>
            <div className="mt-1 border-[3px] border-mm-black bg-mm-bone p-3 shadow-mm-sm">
              <p className="font-display text-lg leading-tight text-mm-black">{step.title}</p>
              {step.condition && <p className="mt-1 text-[13px] leading-snug text-mm-black/70">{step.condition}</p>}
              <ul className="mt-3 space-y-2">
                {step.messages.map((m) => (
                  <li key={m.label} className="border-t-[2px] border-mm-black/10 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`border-[2px] border-mm-black px-1.5 py-0.5 font-sticker text-[9px] tracking-[0.12em] text-mm-black ${STATUS[m.status].cls}`}>
                        {STATUS[m.status].text}
                      </span>
                      <span className="text-sm font-bold text-mm-black">{m.label}</span>
                      {m.render && <ViewEmailButton onClick={() => onOpen(m)} />}
                    </div>
                    <p className="mt-1 text-[12px] text-mm-black/60">To: {m.to}</p>
                    {m.note && <p className="mt-1 text-[12px] leading-snug text-mm-black/75">{m.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GuestJourneys() {
  const { show, modal, error } = useEmailPreview();
  const open = (m: Message) => m.render && show(m.render, m.to);

  return (
    <div>
      <div className="border-[3px] border-mm-black bg-mm-bone p-4">
        <h2 className="font-display text-2xl leading-none text-mm-black">GUEST JOURNEYS</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mm-black/75">
          Everything that happens after someone books, for each traveller type. "View email" opens the real email
          from the live templates, filled with a sample guest (Sam, Vietnam 14 days, departing 28 Oct). Every
          departure runs: there's no minimum number of travellers. To see one guest's journey, open Bookings and
          click "journey" on their row.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-mm-black/70">
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`border-[2px] border-mm-black px-1.5 py-0.5 font-sticker text-[9px] tracking-[0.12em] text-mm-black ${STATUS[s].cls}`}>{STATUS[s].text}</span>
              {s === "live" ? "sending today" : s === "planned" ? "agreed, not built yet" : "waiting on a decision"}
            </span>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-mm-pink">Couldn't build that preview: {error}</p>}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <Lane title="ROUTE 1 · INDEPENDENT" sub="Travelling alone. One spot. Always runs." steps={steps(false)} onOpen={open} />
        <Lane title="ROUTE 2 · WITH A CREW" sub="Booked to travel with a group. Runs whatever the numbers; under 5 gets a heads-up." steps={steps(true)} onOpen={open} />
      </div>
      {modal}
    </div>
  );
}
