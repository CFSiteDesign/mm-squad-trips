-- Applied manually via Lovable MCP on 2026-07-29 (guards make re-runs no-ops).
-- Quarterly creator-code prize draw: one winner per bracket per quarter.
-- The unique index makes a re-run for the same quarter a no-op, and past
-- winners are excluded from later draws by the edge function.
create table if not exists public.prize_draws (
  id uuid primary key default gen_random_uuid(),
  drawn_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  bracket text not null check (bracket in ('short','long')),
  booking_id uuid references public.bookings(id) on delete set null,
  booking_ref text,
  guest_name text,
  guest_email text,
  code text,
  creator_name text,
  trip_name text,
  trip_days integer,
  entries_in_pool integer,
  notified boolean not null default false
);
create unique index if not exists prize_draws_period_bracket_idx
  on public.prize_draws (period_start, period_end, bracket);
alter table public.prize_draws enable row level security;
revoke all on public.prize_draws from anon, authenticated;
grant all on public.prize_draws to service_role;
