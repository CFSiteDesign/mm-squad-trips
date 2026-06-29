# Booking lifecycle: Confirmation → Trip Confirmed → 7-Day Reminder

## Stage 1 — Deposit confirmation (immediate, on Stripe webhook)

Rewrite `bookingConfirmationEmail` so it:

- Confirms the trip + departure date + spots + amount paid.
- Tells the guest **not to book flights yet** — wait until the trip is officially "Confirmed".
- Explains: we confirm trips once we hit a 5-booking minimum, and we'll be in touch **30 days before departure or sooner once confirmed**.
- Keeps booking ref + "View booking" button.

Internal ops notification (already shipped) stays as-is.

## Stage 2 — Trip becomes "Confirmed"

### Data model

Add to `departures`:
- `status` text — `pending` (default) or `confirmed`
- `confirmed_at` timestamptz
- `min_bookings_to_confirm` int default `5`

Trigger logic (extends existing `recompute_departure_spots`):
- When confirmed booking count reaches `min_bookings_to_confirm` and `status = 'pending'`, set `status = 'confirmed'` and `confirmed_at = now()`.
- Insert a row into a new `departure_events` queue table (`event_type = 'confirmed'`, processed flag) so an edge function can pick it up and send emails. This avoids sending email from inside a DB trigger.

### New edge function `process-departure-events` (cron, every 5 min)

For each unprocessed `confirmed` event:
1. Load all confirmed bookings on that departure.
2. For each lead booker, send a `tripConfirmedEmail`:
   - "Your trip is officially CONFIRMED — book your flights."
   - Departure date, arrival city, recommended arrival window.
   - **Balance payment link** (Stripe-hosted) — due 7 days before departure, payable anytime now.
   - Booking ref + dashboard link.
3. Mark the event processed.

### Balance payment link

Extend `create-checkout-session` (or add `create-balance-payment-link`) to mint a Stripe Checkout session for the outstanding balance per booking group, keyed by booking ref so the existing `stripe-webhook` can credit it and mark `balance_paid_at`.

This replaces the auto-charge path in `charge-trip-balances` for trips where the guest pays via link. **Question for you below.**

## Stage 3 — 7 days before departure

Extend the existing `charge-trip-balances` cron (or split into a sibling `send-departure-reminders` cron — cleaner):

For every confirmed booking whose departure is exactly 7 days away:
- If balance still outstanding → `balanceReminderEmail` with payment link + countdown.
- If balance paid → `tripCountdownEmail` (hype, no payment ask).
- Both include **trip-specific final details**, picked by `trip_slug`:
  - Vietnam: meeting point, what to pack, weather, WhatsApp link.
  - Indonesia: same shape, Indonesia-specific.
  - Cambodia: same shape, Cambodia-specific.
- WhatsApp link per trip stored in a small `trip_meta` JSON in `trips` table (or hard-coded constants in `_shared/trip-details.ts` for now — swap to DB later when you send the links).

## Admin

- Admin dashboard gets a `Status` column on departures (Pending / Confirmed) and a manual **"Mark confirmed"** button so you can override (e.g. for comp groups under 5).
- Hayley keeps existing ops email; add a `tripConfirmedOpsEmail` so ops also gets notified when each departure flips to confirmed.

## Questions before I build

1. **"5 bookings in the 30 days before departure"** — does this mean a departure can only flip to `Confirmed` once we're inside the 30-day window? Or: confirm as soon as 5 bookings exist, even if that's 90 days out? I'd default to **confirm immediately at 5 bookings** (better guest experience, lets them book flights early), but say the word if you want it gated to T-30.
2. **"Takeover structure/timeframe"** — I don't have that reference. Got a doc / Notion link / paste of the cadence you want me to follow?
3. **Balance collection** — today the cron `charge-trip-balances` auto-charges the saved card 7 days before departure. Do you want to:
   - (a) **Replace** auto-charge with a payment link (guest pays manually), or
   - (b) **Keep** auto-charge as the default and only use the link as an "I want to pay now" option in the confirmation email?
4. **WhatsApp links** — send when ready; I'll stub placeholders per trip until then.

Once you answer 1–3 I'll ship the migration, the three email templates, the events queue, and the cron.