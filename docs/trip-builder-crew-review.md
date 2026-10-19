# Trip builder: the new-trip email and the crew review page

Ewan, 20 Oct 2026. What the crew gets when a guest sends a trip, and how they act on it.

## What changed

**The email** ("Trip to check: …", to Ewan, optional CC to the team) now shows the whole trip the way the guest built it:
who they are and how to reach them, length and dates, every stop with its tours and the travel to the next stop, the money
(beds, tours, travel, the guest's own spending money, their budget, a suggested balance), a "heads up" list (partner hostels,
festivals clashing with their dates, leaving soon, over their budget, tours that don't fit), and their note.
Three buttons at the top and bottom: **Approve**, **Not approved**, **Edit it**.

**The review page** (`/all-in-trips/trip-builder/#/crew/<ref>?k=<key>`) is where the buttons go. Same trip, plus the three decisions:

| Button | What it does |
| --- | --- |
| Approve | Asks for the balance (pre-filled: trip cost for everyone less the deposit; spending money is never charged) and an optional note, then emails the guest to choose how to pay it (all now, a week before they leave, or instalments). Nothing is charged until they choose: see [trip-builder-payments.md](trip-builder-payments.md). Same as Admin > "Send the final price". |
| Not approved | Reason for the guest, and "refund the deposit" (ticked). Same as Admin > "Decline". |
| Edit it | Opens the trip in the builder with a "Save our version" bar. Saving updates the request (route, days, dates, estimate, trip link), moves it to *checking*, and keeps the guest's own version in `payload.original`. Then Approve sends the guest the edited plan. |

Opening a link only **reads**. Nothing is sent, charged or refunded until someone presses the button inside a panel, so mail scanners that follow links do nothing.

## Links and security

The `k` key is `HMAC-SHA256(ref + expiry)` signed with `ADMIN_PASSWORD` (or `TRIP_BUILDER_LINK_SECRET`, if you want to rotate it separately).
It works for **one trip only**, for 30 days, and only while that trip is still being checked. It cannot list requests or make new links.
It sits in the `#fragment`, so it is never sent to a server or logged. Treat the email like a key: forward it inside the team only.
Admin > Trip builder has a **Review page** button that makes a fresh link for any open trip.

## Setup

1. Deploy the changed functions: `trip-builder-request`, `trip-builder-admin`, `trip-builder-test-emails` (they share `_shared/email.ts`, `_shared/trip-builder.ts`, `_shared/trip-builder-crew.ts`).
2. `public/trip-builder` has the new builder files (`crew.js`, `ui-crew.js`, `crew.css`, `logic.js`, one line in `app.js`, three tags in `index.html`, and `CREW_ENDPOINT` in `config.js`). Deploy the site.
3. Optional: set `TRIP_BUILDER_TEAM_EMAILS` (comma separated) in the function secrets to copy the team on every new-trip email.
4. Press the test send (`trip-builder-test-emails`). It emails Ewan the five trip builder emails and creates a sample request, `MM-SAMPLE` ("Charlie (sample)"), so the buttons in the first email open something real. Approving the sample sends Ewan a real payment link for the amount typed: don't pay it. Decline it to clear it from the To do list.

Trips sent before the builder was updated have no stored summary. The review page rebuilds the view from the guest's own link; the email falls back to the plain itinerary (buttons still work).

## Tests

`deno test supabase/functions/_shared/` covers the key signing (own trip only, 30 days, tampering, wrong secret), the link format, and cleaning the summary the browser sends.
