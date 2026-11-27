-- Koh Rong Ultimate Party Package (brief "Changing Post Festival Package to
-- Koh Rong Party Package", 27 Nov 2026). The post-festival package
-- (20261110090000) becomes weekly: every Wednesday, December to March, 5
-- nights, $220, with no festival or December dates.
--
-- The slug stays cambodia-post-festival: guests never see it, and the emails,
-- Klaviyo and the team CCs read "Cambodia" from it. The trip has no bookings.
--
-- Departures are written out here, Wednesday 2 Dec 2026 to Wednesday
-- 31 Mar 2027, rather than through start_weekday: extend_weekly_departures
-- would keep adding Wednesdays past March. They copy the first departure's
-- settings (50 spots, min 1, so nobody gets the under-5 heads-up). The
-- existing 16 Dec row is one of the Wednesdays and is left as it is.

update public.trips
set name = 'Koh Rong Ultimate Party Package',
    default_price = 220,
    activity_count = 3,
    stops = '[
      {"name": "Koh Rong", "nights": 5, "photos": [], "activities": ["Free drink every night at the Meet Up", "2 hours of free-flow beer, spirits and cocktails", "Koh Rong Boat Party (ticket + $10 bar credit)", "Nestival", "Soundgarden"], "description": "Five nights on Koh Rong: Mad Monkey, daily breakfast, free flow on the first night, the Koh Rong Boat Party, Nestival and Soundgarden."}
    ]'::jsonb
where slug = 'cambodia-post-festival';

insert into public.departures
  (trip_id, departure_code, departure_date, total_spots, spots_remaining, bookable, status, min_bookings_to_confirm, visibility, force_bookable)
select t.id, 'KRP-' || to_char(w::date, 'YYYY-MM-DD'), w::date, 50, 50, true, 'pending', 1, 'public', false
from public.trips t
cross join generate_series(date '2026-12-02', date '2027-03-31', interval '7 days') as w
where t.slug = 'cambodia-post-festival'
  and not exists (select 1 from public.departures d where d.trip_id = t.id and d.departure_date = w::date);
