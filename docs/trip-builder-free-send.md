# Free to send (Ewan, 23 Oct 2026)

Sending a trip to the crew for checking used to take a $50 per person deposit on Stripe. It is now **free**: no payment, no Stripe, nothing to refund. A real person checks the trip first; the guest pays only after the crew has approved it and said the price.

## What a guest sees

1. **Send it.** The builder's form says sending is free. `trip-builder-request` saves the trip as `submitted` and answers at once with `{ ref, status: "submitted", key, hold }` (no `checkoutUrl`). The guest gets an email ("Your trip is with the crew", with their key) and **Ewan and the team get the new-trip email straight away**, with the Approve / Not approved / Edit it buttons. The bed hold (48 hours) starts now when there is a start date.
2. **The crew checks it** on the review page (or Admin > Trip builder) and sets the price. The suggested price is the whole trip cost for everyone: there is no deposit to take off. The guest gets the "Your trip is checked" email.
3. **The guest chooses how to pay** (all now, a week before they leave, or instalments when they leave 60+ days out). No card is on file yet, so one is saved as part of choosing:
   - **All now**: a normal Checkout payment.
   - **Instalments**: the first payment is a Checkout payment that also saves the card (`customer_creation: "always"`, `setup_future_usage: "off_session"`). The rest is charged to it by the daily job.
   - **A week before they leave**: they are sent to a Checkout page in **setup mode** to save a card (cards only, nothing charged). When it is saved (`stripe-webhook`, kind `trip_builder_card`) they are booked, with one payment of the price a week before they leave. It books only if the trip is still `ready` at the price they were shown (`amt` in the session's metadata); if the price changed or the trip went back to the crew meanwhile, the card is kept, nothing is booked and Ewan is told, and the guest chooses again (the card is on file, so it books at once).
4. Booked, then the daily job, reminders and receipts work as before ([trip-builder-payments.md](trip-builder-payments.md)).

## The switch

`TRIP_BUILDER_DEPOSIT_PER_PERSON` (a Supabase secret) is the whole switch: **unset, `0`, or anything that isn't a whole number from 1 to 1000 means free** (a typo can never charge anyone something odd). A number such as `50` brings the old deposit back: `trip-builder-request` saves the trip as `pending_payment` and returns a Stripe Checkout link, and the crew is told when it is paid. The builder's `DEPOSIT_PER_PERSON` in `public/trip-builder/config.js` should be the same number (the page follows what the backend answers, so a mismatch is harmless, but its wording follows the config). It is read on every request: changing the secret needs no deploy.

Trips that already paid a deposit are untouched: their card is on file, "a week before" books at once, and a decline refunds the deposit.

## Open to anyone, so a few things are tightened

Sending used to cost $50, which kept junk out. Free means anyone can send a trip with any email address, so:

- **Pressing Send twice, or trying again after a dropped connection** (common on a phone abroad) doesn't put two copies in front of the crew: the same contact and the same trip within ten minutes is the one already sent. The reply says `duplicate: true`, sends no second email, and does **not** repeat the guest's key (it is in the first reply and the first email; handing it to whoever repeats a contact and a trip would let a stranger open someone's trip).
- **5 trips an hour per contact and 10 per address** (added with the links hardening, see [trip-builder-journeys.md](trip-builder-journeys.md)); a refused request saves nothing.
- **Nothing a sender typed reaches somebody else's inbox as text of their own.** The first email to the guest prints only their first name (letters only, otherwise "there") and a route only if it reads as a route (no links, addresses or messages). The log-in email does the same. A guest who changes a trip that nobody on the crew has picked up yet gets no confirmation email (the crew still gets the update); once the crew has it, the confirmation prints plain text only.
- The new-trip email goes to Ewan and the team only, so what a sender types in it is read by people who know it is a form.

If junk still gets through, the next steps are a Cloudflare Turnstile check on the form, or set the secret to bring the deposit back.

## Where it changed

`trip-builder-request` (free path, deposit kept behind the switch), `_shared/trip-builder.ts` (`depositPerPerson`, `needsDeposit`, `handleTripBuilderSubmitted`, the card-saving branches of `handleTripBuilderPaid`, `plainFirstName` / `plainText`), `trip-builder-pay` (the card page for "a week before"; the first instalment saves the card), `trip-builder-admin` (the crew can act without a deposit), `trip-builder-status` (`canPay`, no card needed to be offered every plan), `trip-builder-revise`, `trip-builder-login`, `stripe-webhook` (the new kind), `_shared/email.ts` (`tripBuilderReceivedEmail`, and every email reads correctly when nothing was paid up front), `TripBuilderAdmin.tsx`, `trip-builder-test-emails`, and the live builder's `config.js` (`DEPOSIT_PER_PERSON: 0`). No migration: `deposit_amount` is 0 on a free trip.

Tests: `trip-builder-free.test.ts` and `trip-builder-pay.test.ts` (Deno), and sections 11 onwards of the end-to-end run (161 checks in all) (`handoff/all-in-backend/e2e` in Ewan's builder repo), which run every flow above against fakes for Supabase, Stripe and Resend.
