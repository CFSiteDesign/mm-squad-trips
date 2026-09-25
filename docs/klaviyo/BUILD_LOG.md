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

### 2026-09-23 · Test mode on, first profile landed in Klaviyo
- Mich's lists found by name through the API (no need for anyone to copy ids):
  Vietnam 14 `RXTTAR`, Vietnam 7 `UJt79T`, Indonesia 12 `WdctkB`,
  Indonesia 7 `Ui8jkd`, Cambodia 14 `XjKN29`. No Thailand list yet.
- Decision: did not reuse any existing "Test" list (four of them exist, any
  could have a flow attached that sends email). `create_test_list` made
  "ALL IN - Sync Test" (`VpCVDs`) and stored the id itself.
- Config through Lovable: mode `test`, allowlist = Charlie's email only.
- `test_profile` (synthetic vietnam-7 booking, no DB rows) worked first time:
  profile created, added to the test list, "ALL IN Booking Placed" event
  accepted. Profile import, add-to-list and events endpoints all fine on
  revision 2025-07-15.
- Cosmetic: synthetic name "ALL IN Test" splits into first "ALL" / last "IN
  Test". Real bookings split on the first space, which is right for most
  names. Left as is.
- Not yet deployed: the outbox hooks in the four lifecycle functions
  (stage 2). Waiting for Charlie's go, since that touches stripe-webhook.

### 2026-09-23 · Klaviyo account time zone confirmed: Singapore (UTC+8)
- One hour ahead of Vietnam, Cambodia and Thailand; same as Bali and Lombok.
  Date-property flows on `allin_departure_date` land on the right calendar
  day for every trip. No change needed.
- For Mich: send times in flows are Singapore time, so "8am on departure day"
  reaches Vietnam, Cambodia and Thailand guests at 7am local.

### 2026-09-23 · Mich's list ids cross-checked, plus a master list
- Charlie's ids from Mich match the five I read through the API exactly.
- New: "ALL IN - Bookers" `RsVDpj`, a master list of every booker on top of
  the trip lists. Config key `klaviyo_list_all`; live mode adds each guest to
  their trip list and this one. Test mode still only touches the test list.
- Still no Thailand list.

### 2026-09-23 · Stage 2 deployed, still locked in test mode
- Charlie: run stage 2 "in the controlled environment" so the team can test in
  Klaviyo (he has no Klaviyo login himself).
- Deployed as-is through Lovable: stripe-webhook, process-departure-events,
  charge-trip-balances, cancel-underfilled-departures, klaviyo-sync. Mode
  stays `test`. Real bookings now write to `klaviyo_outbox`; in test mode a
  real guest's row is "held" (stays pending, nothing sent). At go-live,
  `skip_stale` retires them and `backfill` syncs the profiles.
- Thailand list from Mich: "ALL IN - Thailand" `XyHQCX`, confirmed by name
  through the API, stored in `klaviyo_list_thailand`.

### 2026-09-23 · DB trip names are inconsistent
- Dry run showed `allin_trip_name` values "Vietnam", "Vietnam 7-Day Adventure",
  "Indonesia Island Hopping", "7 Day Gili T + Lombok". Useless in an email.
- Fix: `allin_trip_name` is now built as "{Country} {days} Days", the way Mich
  named her lists ("Vietnam 14 Days", "Indonesia 7 Days", "Thailand 11 Days").
  New `allin_country` for per-country flows. Caught before anyone built on it.

### 2026-09-23 · test_journey: every event, fake guests only
- New action `test_journey`: one fake guest per trip, each down a different
  path, so all five metrics and every state exist on the test list. No
  bookings rows, no Stripe, no outbox, test list only.
- Trick: plus addressing. `me+allin-vietnam@gmail.com` is its own Klaviyo
  profile but lands in `me@gmail.com`'s inbox, and plus variants of an
  allowlisted address count as allowlisted. One inbox, six guests.
- Result: 6 profiles, 16 events, all five metrics created in the account.
  Trip lists and "ALL IN - Bookers" untouched.

### 2026-09-23 · Read-back 403: key lacks metrics:read
- Tried: new `check` action reads a test profile, its lists and events back
  from Klaviyo, so we can verify without a Klaviyo login.
- What happened: `GET /events/?include=metric` -> 403 "missing required
  scopes: metrics:read". Profile and list reads were fine.
- Why: the private key was made without that scope. Sending never needs it.
- Fix: `check` falls back to metric ids when names are refused. Five distinct
  ids across the 16 events, matching the five metrics. If names are wanted,
  add read-only `metrics:read` to the key; not required.

### Known limits (for the runbook)
- One Klaviyo profile per email. A guest with two ALL IN bookings keeps the
  properties of whichever booking synced last. Rare; revisit if it happens.
- In test mode the drain reads the oldest 100 pending rows. Held rows for
  real guests stay pending, so a long test period with 100+ bookings would
  crowd out allowlisted rows. Not close today; `skip_stale` clears it.
- After go-live the test profiles still exist with `allin_test = true` and
  future dates. Live flows need the filter "allin_test is not true".

### 2026-09-25 · Mich's first test flow did not fire
- Tried: Mich built a flow triggered by "added to list ALL IN - Sync Test",
  filtered to Indonesia, three push notifications 30 minutes apart.
- What happened: nothing fired. The Indonesia test guests show only our 4
  events each.
- Why: a list-triggered flow only fires for profiles added AFTER it goes
  live. The six test guests were added on 23 Sep, before the flow existed.
  Re-adding an existing member does not re-trigger it either.
- Fix: a fresh plus address makes a brand new list member.
  `test_profile` with `charlieboyy02+allin-indonesia-flowtest1@gmail.com`,
  trip indonesia, added 25 Sep 01:07 UTC. Lesson for the runbook: every
  list-trigger test needs a new address, and real guests are fine because a
  new booker is always a new list member.
- Second catch: the test guests are email-only profiles with no app device,
  so push steps will be skipped even when the flow fires. A real push test
  needs a team member's email that is logged into the Mad Monkey app.
  Same question for go-live: guests only get pushes if the app knows them by
  the email they booked with.

### 2026-09-25 · A second Klaviyo integration exists on a branch
- Found `origin/feature/klaviyo-functionality` (Ayush, 23 Sep): an admin-only
  `send-test-klaviyo` function that adds a fake booker straight to
  "ALL IN - Bookers" with metric "Booked ALL IN Trip" and a different secret
  name (`KLAVIYO_PRIVATE_API_KEY`). It imports a `syncBookerToKlaviyo` helper
  that is not in the repo, so it cannot build as pushed. Not on main, not
  deployed through Lovable.
- Charlie's own profile is now on "ALL IN - Bookers" and got four extra
  "ALL IN Booking Placed" test events on 23 Sep 07:10 to 07:31 UTC, one with
  fields our code never sends (`amount_paid`, `balance_due`, `full_due`).
  Not from klaviyo-sync on main. Most likely local testing on that branch.
- Risk: two pipelines would double every booking under two metric names,
  and that branch has no test/live gate. Needs one owner. Raised with Charlie.

