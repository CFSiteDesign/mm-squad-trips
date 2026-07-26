# ALL IN Trips → Creator Hub: affiliate commission plan

Source of truth: **"All in trips - Affiliate brief"** (Lexie/Kyle) + Kyle's Chat message
(Fri 9:50pm). Rewritten 2026-07-27 after reading the brief and auditing what is
already built.

---

## What the brief actually asks for

> "We're adding a new commission category to the Creator Hub — ALL IN Trips. Same
> system, same dashboard, no new build from scratch."

- Creators refer using their **existing affiliate code**. Guest pays full price.
- **14-day trip → creator earns $50. 7-day trip → creator earns $25.**
- Guest reward is **not a discount**: 2 free hostel nights (any Mad Monkey property,
  valid 3 months, auto-issued voucher on booking confirmation — Dhany building) **+
  entry into a draw** to win another trip of the same length.
- ALL IN becomes a **fourth category** next to Beds, Travel + Tours, Events — one
  dashboard, broken out as its own line.
- **Not all codes qualify.** Admin-side per-code flag: "ALL IN eligible: yes/no",
  controlled by the Mad Monkey side. Everything else for that creator is unchanged.
- **Commission confirms only when the final trip payment lands** — not the deposit.
  Cancellation before that = no commission.
- Side note in the brief: the **Events** category is currently Dutchies-only and
  "ideally will apply ASAP to everyone by default".

---

## The two systems

| | ALL IN TRIPS | Creator Hub / Creator Revenue |
|---|---|---|
| Lovable project | `mm-squad-trips` (`7ddaa420…`) | `mm-influencer-rev` (`e90d5e0b…`) |
| Local repo | `~/mm-squad-trips` ✅ | none — Lovable-only, drive via prompt |
| Backend | Lovable Cloud / Supabase | Supabase `jtiawsakiidtfobophyv` |
| Key tables | `discount_codes`, `bookings`, `trips` | `creators` (332), `creator_revenue`, `creator_monthly_revenue` |
| Revenue today | live Stripe checkout | Google Sheet → `sheets-sync` (`rd_*` beds, `hgl_*` tours, `events_revenue`) |

**Principle: ALL IN TRIPS' database is the source of truth for trips commission.**
The Hub reads it over a signed API and stores a monthly snapshot. That removes the
`ALL IN → Cloudbeds → mark sheet → Creator Hub` chain Kyle flagged.

Trips are priced and charged in **USD**. Live trips: Cambodia 14d ($650),
Indonesia 12d ($700), Indonesia 7d ($450), Vietnam 14d ($850), Vietnam 7d ($310).

---

## Already built (commit `6ce05b1`, 27 Jul) — trips side

- `discount_codes.is_creator`, `creator_name`, `commission_7day` (25),
  `commission_12day` (50) — migration `20260727100000_creator_tracking_codes.sql`,
  applied to the live DB.
- Three $0 tracking codes seeded and active: `YELLOW4MADMONKEY`, `CODE4MADMONKEY`,
  `LYLO4MADMONKEY` (expiry 2026-09-15).
- `validate-discount` returns `isCreator`; the booking form shows
  "Creator code applied — you're in the prize draw! 🎉" instead of "$0 off".
- Admin → Creators tab: per-code 7-day vs 12+ bookings, travellers, commission owed,
  total prize-draw entries. Window hardcoded 15 Jul – 15 Sep 2026, cancelled excluded,
  deduped per checkout.

So the **$0-tracking-code model and the $25/$50 rates already match the brief.** What
follows is the gap.

---

## Gap analysis

| Brief requirement | Status | Work |
|---|---|---|
| Guest pays full price, code is tracking-only | ✅ done | — |
| $50 (14-day) / $25 (7-day) | 🟡 rates right, tiering by `trips.days ≤ 7` | confirm Indonesia at **12 days** pays the $50 tier |
| Creators use their **existing** affiliate code | ❌ | seeded codes are partner-style (`*4MADMONKEY`), not hub codes (`AARON10`) |
| Only approved codes eligible, admin toggle | 🟡 `is_creator` exists in trips admin | toggle needs to live where Mad Monkey controls it (Hub) |
| Commission confirms on **final payment** | ❌ | admin counts at booking; needs pending/confirmed split |
| ALL IN as 4th category on Hub dashboard | ❌ | Hub untouched |
| Coupon report tracking same as current | ❌ | needs the API + sync |
| 2 free nights voucher, 3-month validity, auto-issued | ❌ | Dhany dependency + issuance hook |
| Draw entry per trip length | 🟡 one shared entry count | split into 7-day and 14-day draws |
| Events category default-on for everyone | ❌ | Hub-side change (brief side note) |

---

## Phase A — ALL IN TRIPS (local repo)

**Done 27 Jul:** A1 (commission timing), A2 (draw entries per tier), A3 (321 codes
imported, no expiry). Remaining: A4 voucher, A5 API, A6 eligibility write-through.


**A1. Commission state machine.** The brief's timing rule is the biggest correction.
Derive per booking:

- `void` — status `Cancelled`, or refunded.
- `confirmed` — balance settled: `balance_status = 'paid'` / `balance_charged_at`
  set, **or** `payment_type = 'Full'` (paid in full at checkout).
- `pending` — deposit paid, balance outstanding.

Commission owed = confirmed only. Pending shown separately so creators see what's
coming without it being payable. Applies to the admin tab **and** the API.

**A2. Prize draw, per tier.** Split entries into the 7-day draw and the 14-day (12+)
draw — the brief promises "another 7-day trip" / "another 14-day trip" separately.
Store entries as rows (auditable list of qualifying bookings), not a live recount in
the browser.

**A3. Seed the approved codes.** ⛔ Needs the approved list. Idempotent upsert,
with a hard pre-flight check against `squad_leaders.code` — `validate-discount` reads
`discount_codes` first, so a clash would silently hijack a squad leader's code.

**A4. Guest reward issuance.** 2 free nights, any property, 3 months from issue,
auto-issued on booking confirmation. Interim if Dhany's system isn't ready: generate
a voucher code per booking, store it, include it in the confirmation email, and hand
ops a redemption list. Needs a decision on who honours it at property level.

**A5. `creator-trips-revenue` edge function.** Modelled on `staff-leaderboard`
(server-side secret, aggregate-safe fields only).

- Auth: `x-api-key` vs `CREATOR_HUB_API_KEY`. Never called from a browser.
- Body: `{ code?, month?, all?: true }`
- Per creator per month: `bookings`, `travellers`, `commission_confirmed`,
  `commission_pending`, `draw_entries_7d`, `draw_entries_14d`, `by_trip[]`.
- No guest names, emails or booking refs — same privacy line as the staff leaderboard.

**A6. Eligibility write-through.** Small authed endpoint so the Hub admin toggle sets
`is_creator` on the trips code. One enforcement point, no drift.

**Deploy:** `git push` syncs the Lovable workspace, then **Publish** in Lovable — two
steps; the push alone does not go live.

---

## Phase B — Creator Hub (`mm-influencer-rev`, via Lovable prompt)

**B1. Table**

```sql
create table if not exists public.creator_trips_revenue (
  id uuid primary key default gen_random_uuid(),
  creator_code text not null,
  month text not null,                          -- 'YYYY-MM'
  bookings integer not null default 0,
  travellers integer not null default 0,
  commission_confirmed numeric(10,2) not null default 0,
  commission_pending numeric(10,2) not null default 0,
  draw_entries_7d integer not null default 0,
  draw_entries_14d integer not null default 0,
  by_trip jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  unique (creator_code, month)
);
```

**B2. `trips-sync` edge function** — calls ALL IN TRIPS with the shared secret from
Supabase secrets, upserts every row. Hourly cron + a **Sync now** button in admin.
Proxying keeps the key server-side, gives the Hub its own history, and keeps the
dashboard rendering if the trips backend is down.

**B3. UI — fourth category.** "ALL IN" card beside Beds / Travel + Tours / Events on
the creator dashboard, and a detail view: bookings, travellers, **confirmed vs pending
commission**, per-trip table, draw entries. Same components and language as the
existing cards — one dashboard, not a bolted-on tab. Hidden for creators who are not
ALL IN eligible.

**B4. Admin: "ALL IN eligible: yes/no"** per creator, writing through to A6. Plus
totals and a payout export.

**B5. Events for everyone.** Drop the Dutchies-only gate so Events shows by default —
called out in the brief, cheap while we're in the file.

---

## Phase C — QA and ops

1. Test code end-to-end: checkout with a creator code (or `admin-add-comp-booking`),
   confirm booking attribution, pending commission, draw entry.
2. Run `charge-trip-balances` against it → commission flips to confirmed.
3. Cancel it → drops out on both sides.
4. Payout export: `creator_code, month, commission_confirmed` CSV so finance never
   opens either CRM.
5. Reply to Cai on the brief thread with what "runs on the existing Creator Hub
   affiliate system" now means in practice: shared codes, trips $$ originating in
   ALL IN TRIPS, surfaced in the Hub.

---

## Decisions made (Charlie, 27 Jul)

- **Codes:** Lexie's list of 323 — imported as **321** (`TEST10` / `TESTT10` dropped).
- **No expiry** on the creator codes; ALL IN is permanent. Only the three partner
  codes (`YELLOW`/`CODE`/`LYLO4MADMONKEY`) still stop on 15 Sep 2026. The admin
  tab's hardcoded 15 Jul – 15 Sep window is gone.
- **One prize draw**, not two — the winner gets whichever trip length they booked,
  so entries are tagged 7-day / 12+ rather than split into separate pools.

## Open questions (with Cai)

1. **Indonesia is 12 days, not 14** — does it pay the $50 tier? Built as $50.
2. **Full-payment bookings** — commission confirms immediately at checkout? Built
   as yes (paying in full *is* the final payment).
3. **Voucher ownership** — Dhany's system issues the 2 free nights, or ALL IN TRIPS
   generates and ops honours it?

Data hygiene for Lexie: two emails are each on two creators —
`zsuzsipalocz@gmail.com` (ZSUZSI10 + LINDSEY10) and `jimjimenez1996@gmail.com`
(JIM10 + KAYLA10). 281 of 321 codes have no email at all.

---

## Order of work

| Step | Where | Blocked on |
|---|---|---|
| A1 commission state machine | local repo | — |
| A2 per-tier draw entries | local repo | Q6 (can build with one-entry-per-booking) |
| A5 API + A6 eligibility endpoint | local repo | — |
| A3 seed approved codes | local repo | ⛔ Q1 |
| B1 + B2 sync | Lovable prompt | A5 deployed |
| B3 + B4 UI | Lovable prompt | B2 |
| B5 Events default-on | Lovable prompt | — |
| A4 voucher issuance | local repo + Dhany | Q5 |
| Phase C | both | all of the above |

A1, A5, A6 and B5 need nothing from anyone and can start now.
