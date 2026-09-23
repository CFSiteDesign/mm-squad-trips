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

### 2026-09-23 · Build started, locked off by design
- Charlie: "make sure this doesn't go live straight away… locked off environment
  so no data can be disrupted or false emails/bookings."
- Decision: `app_config('klaviyo_mode')` = off | dry_run | test | live, default
  off. Nothing reaches Klaviyo until Charlie flips it. `test` sends only the
  emails in `klaviyo_test_emails`, always to `klaviyo_list_test`.
- Decision: no real-time push from the Stripe webhook. The lifecycle functions
  only append to `klaviyo_outbox`; `klaviyo-sync` drains it every 15 minutes.
  Smaller blast radius in the payment functions; 15 min is fine for itinerary
  messaging. Real-time can be added later if Mich needs it.
- Decision: deploy in two stages. Stage 1 = migration + klaviyo-sync (nothing
  else changes). Stage 2 = the outbox hooks in stripe-webhook,
  process-departure-events, charge-trip-balances, cancel-underfilled-departures,
  after stage 1 answers `status` and `lists` correctly.
- Known guess to verify: Klaviyo API revision header `2025-07-15`. If `lists`
  returns a revision error, that is the first log entry.
- Known duplication: nights per trip (`vietnam` 13, `thailand` 10, else = days)
  copied from src/data/trips.ts into klaviyo-sync. Backend has no `nights`
  column. If a trip's length changes, both must change.
- Decision: profiles are added to lists with the plain add-to-list call, not
  the subscribe call, because checkout collects no marketing consent. Mich's
  flows must be marked transactional.


## Runbook: the plan that works

_(written at the end, from the log above)_

### 2026-09-23 · Stage 1 deployed, first Klaviyo call worked
- Migration + klaviyo-sync deployed through Lovable, mode `off`. `status`
  answered correctly (key present, outbox empty, 12 unsynced lead bookings),
  wrong cron secret gets 403.
- Worked first time: `lists` (GET /api/lists/) with revision `2025-07-15`. No
  revision error, so the guess above stands.
- Lovable's agent flagged that the new table has no explicit GRANTs. Not a
  problem in practice: `status` counted the outbox through the service role
  fine (Supabase default privileges cover new public tables). Noted in case a
  future table behaves differently.
- Finding: the key opens the MAIN Mad Monkey Klaviyo account (dozens of
  lists: Cloudbeds reservations, newsletter, loyalty…). Test mode + allowlist
  is the only thing standing between a bug and real guests. Keep it.
