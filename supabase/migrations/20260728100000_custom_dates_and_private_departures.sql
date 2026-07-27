-- Applied manually via Lovable MCP on 2026-07-28 (guards make re-runs no-ops).
-- Custom departure dates:
--   * trips.start_weekday — the only weekday a trip may depart on, so custom
--     dates are validated server-side per trip (Sun=0 … Sat=6, UTC).
--   * departures.visibility — admin-created dates are 'public' (listed on the
--     site); guest-created custom dates are 'private' (hidden from browsing).
--   * departures.owner_code — squad code that owns a private date, so entering
--     that code reveals it to the squad. NULL for solo-created private dates.
alter table public.trips add column if not exists start_weekday integer;
update public.trips set start_weekday = 3 where slug in ('vietnam','vietnam-7') and start_weekday is null;
update public.trips set start_weekday = 4 where slug in ('cambodia','indonesia-7') and start_weekday is null;
update public.trips set start_weekday = 6 where slug = 'indonesia' and start_weekday is null;

alter table public.departures add column if not exists visibility text not null default 'public';
do $$ begin
  alter table public.departures add constraint departures_visibility_check check (visibility in ('public','private'));
exception when duplicate_object then null; end $$;
alter table public.departures add column if not exists owner_code text;
create index if not exists departures_owner_code_idx on public.departures (owner_code) where owner_code is not null;
