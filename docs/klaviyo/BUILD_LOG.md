# ALL IN → Klaviyo: build log

Charlie's rule (23 Sep 2026): every time something does not work during this
project, it goes in here the moment it happens. What we tried, what failed,
why, and what fixed it. At the end the log is distilled into the runbook at
the bottom, which is the plan that actually works, for next time.

Keep entries short and dated. No secrets, this repo is public.

## Goal

Every ALL IN booking reaches Klaviyo as a profile with `allin_*` properties,
on that trip's list, with lifecycle events (booking placed, departure
confirmed, balance paid / failed, departure cancelled), so Mich can build
day-by-day itinerary flows off `allin_departure_date`.

## Plan v0 (23 Sep 2026, before building)

- Private API key in Lovable secrets, one shared helper in the edge functions.
- Stripe webhook pushes profile + list + "booking placed" in real time.
- Existing lifecycle functions fire their event and refresh the profile.
- A reconciler cron every 15 min retries failures and refreshes properties.
- One-off backfill of existing future bookings.
- Open decisions: six trips not five (Thailand), leads only or members too,
  transactional-only because checkout collects no consent, the app feed,
  Klaviyo account time zone.

## Log

<!-- One entry per thing that did not work. Newest at the bottom.

### YYYY-MM-DD · short title
- Tried:
- What happened:
- Why:
- Fix / decision:
-->

_(nothing yet, build not started)_

## Runbook: the plan that works

_(written at the end, from the log above)_
