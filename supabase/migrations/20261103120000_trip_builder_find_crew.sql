-- Trip builder: Find your crew (Ewan, 3 Nov 2026). See _shared/trip-builder-find-crew.ts.
-- find_crew holds the guest's cleaned answers when they tick it, null when they don't or once the crew switches it off.
alter table public.trip_builder_requests
  add column if not exists find_crew jsonb;

create index if not exists trip_builder_requests_find_crew_idx
  on public.trip_builder_requests (created_at desc) where find_crew is not null;

-- Where each introduction is. One row per pair of trips, the lower ref always in a (edge function trip-builder-admin, actions crew-list and crew-intro).
create table if not exists public.trip_builder_crew_intros (
  a text not null references public.trip_builder_requests (ref) on delete cascade,
  b text not null references public.trip_builder_requests (ref) on delete cascade,
  status text not null default 'new' check (status in ('new', 'asked', 'yes', 'introduced', 'no')),
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

-- Guests' personal details travel through this table's joins, so nothing but the service role reads it (no policies on purpose), like trip_builder_requests.
alter table public.trip_builder_crew_intros enable row level security;
