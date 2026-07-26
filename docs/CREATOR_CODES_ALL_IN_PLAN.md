# Creator codes on ALL IN TRIPS → Creator Revenue dashboard

Plan agreed off the back of Kyle's Chat message (Fri 9:50pm):

> Add a page to the Creator Revenue dashboard (ALL IN TRIPS), and connect an API to
> ALL IN TRIPS backend so any necessary creator data (e.g. $$) stored there will be
> visible from Creator Revenue. Saves having to login and handle 2 CRMs for $$.

Date: 2026-07-27

---

## The two systems

| | ALL IN TRIPS | Creator Revenue |
|---|---|---|
| Lovable project | `mm-squad-trips` (`7ddaa420…`) | `mm-influencer-rev` (`e90d5e0b…`) |
| Local repo | `~/mm-squad-trips` (git → Lovable) | none — Lovable-only, drive via prompt |
| Backend | Lovable Cloud / Supabase | Supabase `jtiawsakiidtfobophyv` |
| Key tables | `discount_codes`, `bookings`, `squad_leaders`, `squad_bookings` | `creators` (332 codes), `creator_revenue`, `creator_monthly_revenue` |
| Today's revenue sources | Stripe checkout, live | Google Sheet → `sheets-sync` (rooms `rd_*`, tours `hgl_*`, `events_revenue`) |

**Principle: ALL IN TRIPS' database is the source of truth for trips $$.** Creator
Revenue reads it over a signed API and caches a monthly snapshot. That kills the
`ALL IN → Cloudbeds → mark sheet → creator hub` chain Kyle called out — trips data
never touches Cloudbeds or the sheet.

Current state check (27 Jul): ALL IN TRIPS has **4** discount codes
(`EARLYBIRD100`, `TWICE150`, `FIFOAUSTRALIA`, `KS!!32WS11H@`) — all fixed $, none
creator. Creator Revenue has **332** creator codes (`AARON10`, `AMY10`, … all `10`
suffix). Trips are priced and charged in **USD**.

---

## Decisions needed before build (blockers marked ⛔)

1. ⛔ **The code list.** Charlie to send. Assume it's the same codes as the hostel
   codes (`NAME10`) so a creator has ONE code across rooms + trips.
2. ⛔ **Guest discount on trips.** Hostel codes are 10% off a bed. 10% off a
   ~$1,500 trip is ~$150. Same 10%, a lower %, or a fixed $ (e.g. $100 to match
   `EARLYBIRD100`)? Can be set per code.
3. ⛔ **Creator commission** — % or fixed, and of what: gross booking value, or net
   after the guest discount. Stored per code so it can vary by creator tier.
4. **When it counts:** booked-month (date of checkout) vs departure-month. Rec:
   **booked-month** — that's when the code did the work, and it matches how
   `creator_revenue.month` already behaves.
5. **Deposit vs full:** show *booked value* (`final_price`) as the headline and
   *paid to date* (`amount_paid`) underneath. Commission only becomes payable once
   the balance is charged — flag it, don't hide it.
6. **Stacking:** creator codes can't combine with `EARLYBIRD100` etc. (checkout
   only accepts one code today — no change needed, just confirming the rule).
7. **Scope:** all 332 codes live on trips, or a pilot batch first? Rec: **pilot 20**
   for a fortnight, then bulk-enable — one `active` flag flip either way.

---

## Phase 1 — ALL IN TRIPS backend (`~/mm-squad-trips`, local repo)

**1.1 Migration** — `supabase/migrations/2026XXXX_creator_codes.sql`

```sql
alter table public.discount_codes
  add column if not exists is_creator_code boolean not null default false,
  add column if not exists creator_code text,          -- code as it exists in Creator Revenue
  add column if not exists creator_name text,
  add column if not exists creator_email text,
  add column if not exists commission_type text default 'percent',  -- 'percent' | 'fixed'
  add column if not exists commission_value numeric(10,2) default 0;

create index if not exists discount_codes_creator_idx
  on public.discount_codes(creator_code) where is_creator_code;

-- Snapshot the code onto the booking so later edits to a code never rewrite history
alter table public.bookings add column if not exists creator_code text;
create index if not exists bookings_creator_code_idx on public.bookings(creator_code);
```

**1.2 Seed the codes.** Idempotent `insert … on conflict (code) do update` from the
list Charlie sends. Guards before import:
- collision with the 4 existing trip codes,
- collision with `squad_leaders.code` — `validate-discount` checks `discount_codes`
  first, so a clash would silently hijack a squad leader's code. Must be a hard
  pre-flight check.

**1.3 Webhook attribution** — `supabase/functions/stripe-webhook/index.ts` already
resolves `discount_code_id` from the typed code (line ~135). Add: when that code is
a creator code, write `creator_code` onto every booking row for the checkout
(including group members, which already inherit `discount_code_id`).

**1.4 New edge function** — `supabase/functions/creator-trips-revenue/index.ts`

Modelled on `staff-leaderboard` (server-side secret, aggregate-safe fields only).

- Auth: `x-api-key` header vs `CREATOR_HUB_API_KEY` secret. Never called from a
  browser — only from the Creator Revenue edge function.
- Body: `{ code?: string, month?: 'YYYY-MM', all?: true }`
- Excludes `status = 'Cancelled'`, dedupes by `stripe_session_id` where needed.
- Returns per creator per month:
  `bookings`, `travellers`, `gross_value`, `discount_given`, `net_revenue`,
  `paid_to_date`, `commission_owed`, `by_trip[]` (Indonesia / Cambodia / Vietnam),
  and `pending_balance`.
- **No guest names, emails or booking refs** — same privacy line as the staff
  leaderboard.

**1.5 Admin (optional, ship after 1.1–1.4).** A Creator Codes tab in
`src/pages/Admin.tsx`: activate/deactivate, set discount + commission, see usage.
Until then, codes are managed by SQL.

**Deploy:** `git push` syncs the Lovable workspace, then hit **Publish** in Lovable —
two steps, the push alone does not go live.

---

## Phase 2 — Creator Revenue dashboard (`mm-influencer-rev`, via Lovable prompt)

**2.1 Table**

```sql
create table if not exists public.creator_trips_revenue (
  id uuid primary key default gen_random_uuid(),
  creator_code text not null,
  month text not null,                 -- 'YYYY-MM'
  bookings integer not null default 0,
  travellers integer not null default 0,
  gross_value numeric(10,2) not null default 0,
  discount_given numeric(10,2) not null default 0,
  net_revenue numeric(10,2) not null default 0,
  paid_to_date numeric(10,2) not null default 0,
  commission_owed numeric(10,2) not null default 0,
  by_trip jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  unique (creator_code, month)
);
```

**2.2 `trips-sync` edge function.** Calls the ALL IN TRIPS endpoint with the shared
secret (Supabase secret, never in the client), upserts every returned row. Runs
hourly on cron + a **Sync now** button in admin. Proxying it this way means: the key
stays server-side, the hub keeps its own history, and the dashboard still renders if
the trips backend is down.

**2.3 UI**
- Creator dashboard: a fourth revenue card, **ALL IN TRIPS**, alongside Rooms /
  Tours / Events — bookings, travellers, revenue driven, your commission.
- New page `/trips` (linked from the card): month selector, per-trip table, booked
  vs paid split, and a "balance still to be collected" note.
- Admin dashboard totals + leaderboard include trips revenue (behind the same
  month filter as everything else).
- Same look and language as the existing cards — this is one dashboard, not a
  bolted-on tab.

---

## Phase 3 — QA and ops

1. Seed one test code, run a real checkout in Stripe test mode (or
   `admin-add-comp-booking`), confirm the row lands with `creator_code` set.
2. Run `trips-sync`, confirm the creator's dashboard shows it within the hour.
3. Cancel that booking, confirm it drops out of both sides.
4. Payout export: CSV of `creator_code, month, commission_owed, paid_to_date` from
   the admin page, so finance never opens either CRM.
5. Brief Cai — the affiliate brief says "runs on the existing Creator Hub affiliate
   system", which is now true in the sense that codes are shared, but the trips $$
   originate in ALL IN TRIPS. The brief should say that explicitly.

---

## Order of work

| Step | Where | Blocked on |
|---|---|---|
| 1.1 migration + 1.3 webhook | local repo | — |
| 1.4 API endpoint | local repo | — |
| 1.2 seed codes | local repo | ⛔ code list + discount % |
| 2.1 + 2.2 sync | Lovable prompt | 1.4 deployed |
| 2.3 UI | Lovable prompt | 2.2 |
| 1.5 admin tab | local repo | after go-live |
| Phase 3 | both | all of the above |

Steps 1.1, 1.3 and 1.4 need nothing from anyone and can start now.
