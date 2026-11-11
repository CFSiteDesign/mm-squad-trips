-- Black Friday 2026: a cap on how many spots a trip can sell over the sale weekend (Vietnam 7 days: 50, Charlie
-- 11 Nov 2026). The cap itself lives in supabase/functions/_shared/black-friday.ts; this is only the counting.
--
-- A spot counts once it's booked (one bookings row per traveller, not cancelled, not a comp) or while someone is
-- in a Stripe checkout for it. Checkouts during the sale expire after an hour, so a hold lasts a little longer than
-- that and then frees itself. Claims take a per-trip lock, so two people can't both get the last spot.

create table if not exists public.sale_cap_holds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  spots integer not null check (spots between 1 and 5),
  stripe_session_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sale_cap_holds_trip_idx on public.sale_cap_holds (trip_id, expires_at);

-- Server only: no policies, so the public keys can't read or write it.
alter table public.sale_cap_holds enable row level security;

-- Spots left under the cap: booked in the window plus live checkouts that haven't turned into a booking yet.
create or replace function public.sale_cap_left(p_trip_id uuid, p_cap integer, p_from timestamptz, p_to timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select greatest(0, p_cap
    - (select count(*)::int from public.bookings b
        where b.trip_id = p_trip_id
          and b.created_at >= p_from and b.created_at < p_to
          and coalesce(b.status, '') <> 'Cancelled'
          and coalesce(b.payment_type, '') <> 'Comp')
    - (select coalesce(sum(h.spots), 0)::int from public.sale_cap_holds h
        where h.trip_id = p_trip_id
          and h.expires_at > now()
          and (h.stripe_session_id is null
               or not exists (select 1 from public.bookings b where b.stripe_session_id = h.stripe_session_id))));
$$;

-- Holds p_spots for one checkout if they fit under the cap. Returns the hold id, or null when they don't fit.
create or replace function public.sale_cap_claim(
  p_trip_id uuid, p_spots integer, p_cap integer, p_from timestamptz, p_to timestamptz, p_hold_minutes integer
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('sale_cap:' || p_trip_id::text));
  if public.sale_cap_left(p_trip_id, p_cap, p_from, p_to) < p_spots then
    return null;
  end if;
  insert into public.sale_cap_holds (trip_id, spots, expires_at)
  values (p_trip_id, p_spots, now() + make_interval(mins => p_hold_minutes))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.sale_cap_left(uuid, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.sale_cap_claim(uuid, integer, integer, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.sale_cap_left(uuid, integer, timestamptz, timestamptz) to service_role;
grant execute on function public.sale_cap_claim(uuid, integer, integer, timestamptz, timestamptz, integer) to service_role;