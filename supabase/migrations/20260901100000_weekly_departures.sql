-- Weekly departures.
--
-- Every trip now leaves every week on its start weekday (Kyle, Sep 2026). The
-- site reads departures straight from this table, so the schedule has to exist
-- as real rows — the same rows the booking, confirmation, cancellation and
-- reminder jobs already work from. This function keeps a rolling runway of
-- them; pg_cron calls it weekly.
--
-- Rows are created from 31 days out. cancel-underfilled-departures cancels any
-- pending departure inside 30 days that hasn't reached its minimum, so a row
-- born nearer than that would be cancelled the next afternoon before anyone
-- could book it. Born at 16 weeks, a week has the full window to fill.
--
-- Already applied to the shared Supabase project on 1 Sep 2026; this file is
-- the record of it.

create or replace function public.extend_weekly_departures(weeks_ahead integer default 16)
returns table (trip_slug text, departure_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  first_day date := current_date + 31;
  last_day  date := current_date + (weeks_ahead * 7);
begin
  return query
  with active_trips as (
    select id, code, slug, start_weekday
    from public.trips
    where active = true and start_weekday is not null
  ),
  candidate as (
    select t.id as trip_id, t.code, t.slug, d::date as departure_date
    from active_trips t
    cross join generate_series(first_day, last_day, interval '1 day') as d
    where extract(dow from d) = t.start_weekday
  ),
  inserted as (
    insert into public.departures
      (trip_id, departure_code, departure_date, total_spots, spots_remaining,
       bookable, status, min_bookings_to_confirm, visibility, force_bookable)
    select c.trip_id, c.code || '-' || to_char(c.departure_date, 'YYYY-MM-DD'), c.departure_date,
           20, 20, true, 'pending', 5, 'public', false
    from candidate c
    -- Any existing row for that trip + date wins, whatever its status: a
    -- cancelled week stays cancelled rather than quietly reopening.
    where not exists (
      select 1 from public.departures x
      where x.trip_id = c.trip_id and x.departure_date = c.departure_date
    )
    returning departures.trip_id, departures.departure_date
  )
  select t.slug, i.departure_date
  from inserted i join active_trips t on t.id = i.trip_id
  order by t.slug, i.departure_date;
end;
$$;

revoke all on function public.extend_weekly_departures(integer) from public, anon, authenticated;

-- Top up every Monday at 03:00 UTC, before the daily jobs run.
select cron.unschedule('extend-weekly-departures')
where exists (select 1 from cron.job where jobname = 'extend-weekly-departures');
select cron.schedule('extend-weekly-departures', '0 3 * * 1', $$select public.extend_weekly_departures(16);$$);
