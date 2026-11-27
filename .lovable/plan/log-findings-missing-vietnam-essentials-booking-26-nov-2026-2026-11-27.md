# Log findings: missing Vietnam Essentials booking (26 Nov 2026)

## What the logs show
The logs I can read only go back to about **01:21 UTC on 27 Nov 2026**. They don't reach your window, which starts at 25 Nov 12:00 UTC.

- **stripe-webhook:** there are only three lines, all from 27 Nov at 01:21 UTC: a boot line, "Ignoring non-trip checkout session: cs_live_a0aquPOP..." and "push-creator-commission returned 500". None of them is a "Webhook handler error:" line, and none comes from 26 Nov.
- **create-checkout-session:** there are no logs at all.
- **booking-lookup:** there are no logs at all.
- **Failed session or payment intent id:** I can't get it from the logs. No log line from 26 Nov exists.

## Possible next step (read-only, needs your OK)
Search Stripe for her checkout session instead. I would list the checkout sessions completed on 26 Nov between 00:00 and 12:00 UTC, filtered to ALL IN Vietnam Essentials, 2 spots, departing 2027-02-17. I would then compare them with the bookings we saved (04:44, 05:21, 06:05 and 10:46 UTC) and report the cs_live and payment intent ids that have no matching booking.

These are Stripe reads only. Nothing in the app, its data or its settings changes, and nothing is sent.
