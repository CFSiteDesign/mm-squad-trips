// The real ALL IN email templates (supabase/functions/_shared/email.ts, the code
// the edge functions send), filled for one guest. Used by the Guest journeys
// overview (sample guest) and the per-booking journey (the actual booker).
export type GuestEmailData = {
  first: string;
  name: string;
  email: string;
  phone: string;
  /** As the booking emails name it, e.g. "ALL IN Vietnam". */
  tripName: string;
  /** Guest-facing short name used by the later emails, e.g. "14-day Vietnam". */
  shortTrip: string;
  country: string;
  slug: string;
  /** Labels, already formatted. */
  date: string;
  dueDate: string;
  ref: string;
  bookingUrl: string;
  spots: number;
  crew: boolean;
  /** USD totals for the whole booking. */
  paidToday: number;
  balance: number;
  total: number;
  hasBalance: boolean;
};

export type RenderedEmail = { subject: string; html: string };

const email = () => import("../../../supabase/functions/_shared/email");
const details = () => import("../../../supabase/functions/_shared/trip-details");
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export const journeyEmails = {
  confirmation: async (g: GuestEmailData): Promise<RenderedEmail> =>
    (await email()).bookingConfirmedEmail({
      firstName: g.first, tripCountry: g.country, tripName: g.tripName, departureDate: g.date, spots: g.spots,
      balanceAmount: usd(g.balance), balanceDueDate: g.dueDate, payBalanceUrl: g.bookingUrl, bookingRef: g.ref,
      bookingUrl: g.bookingUrl, hasBalance: g.hasBalance,
    }),
  opsAlert: async (g: GuestEmailData): Promise<RenderedEmail> =>
    (await email()).bookingOpsNotificationEmail({
      leadName: g.name, leadEmail: g.email, leadPhone: g.phone, tripName: g.tripName, departureDate: g.date,
      spots: g.spots, amount: usd(g.paidToday), bookingRef: g.ref, bookingUrl: g.bookingUrl,
      travellerMode: g.crew ? "crew" : "independent",
    }),
  headsUp: async (g: GuestEmailData): Promise<RenderedEmail> =>
    (await email()).underfilledCrewNoticeEmail({
      firstName: g.first, tripName: g.shortTrip, departureDate: g.date, bookingRef: g.ref,
      balanceDate: g.hasBalance ? g.dueDate : "",
    }),
  balancePaid: async (g: GuestEmailData): Promise<RenderedEmail> =>
    (await email()).balancePaidEmail({
      firstName: g.first, tripName: g.tripName, departureDate: g.date, spots: g.spots,
      amountCharged: usd(g.balance), totalPaid: usd(g.total), bookingRef: g.ref, bookingUrl: g.bookingUrl,
    }),
  balanceFailed: async (g: GuestEmailData): Promise<RenderedEmail> =>
    (await email()).balanceFailedEmail({
      firstName: g.first, tripName: g.tripName, departureDate: g.date, amountDue: usd(g.balance),
      attempts: 1, nextAttemptDate: "in 2 days", bookingRef: g.ref,
    }),
  manifest: async (g: GuestEmailData, daysOut: 7 | 1, travellers: number): Promise<RenderedEmail> =>
    (await email()).departureTeamReminderEmail({
      daysOut, tripName: g.tripName, tripDays: null, departureDate: g.date, departureStatus: "confirmed",
      travellers, adminUrl: "https://madmonkeyhostels.com/all-in-trips/admin",
      bookings: [{
        ref: g.ref, leadName: g.name, email: g.email, phone: g.phone, spots: g.spots,
        type: g.crew ? "With a crew" : "Independent", payment: g.hasBalance ? "Deposit paid" : "Paid in full", members: "",
      }],
    }),
  finalPaid: async (g: GuestEmailData, daysToGo = 6): Promise<RenderedEmail> => {
    const d = (await details()).tripFinalDetails(g.slug);
    return (await email()).tripCountdownEmail({
      firstName: g.first, tripCountry: g.country, tripName: g.shortTrip, departureDate: g.date, daysToGo,
      bookingRef: g.ref, finalDetailsHtml: d.finalDetailsHtml, whatsappUrl: d.whatsappUrl,
    });
  },
  finalPayLink: async (g: GuestEmailData, daysToGo = 5): Promise<RenderedEmail> => {
    const d = (await details()).tripFinalDetails(g.slug);
    return (await email()).balanceReminderEmail({
      firstName: g.first, tripCountry: g.country, tripName: g.shortTrip, departureDate: g.date, daysToGo,
      balanceAmount: usd(g.balance), payBalanceUrl: g.bookingUrl, bookingRef: g.ref,
      finalDetailsHtml: d.finalDetailsHtml, whatsappUrl: d.whatsappUrl,
    });
  },
};
