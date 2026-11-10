-- Koh Rong post-festival package (brief "Koh Sdach Collective Festival - Post
-- Festival Package", 9 Nov 2026): 5 nights on Koh Rong after The Collective,
-- 16 to 21 Dec 2026, $232. Sold on its own page (/koh-rong-post-festival)
-- through the normal checkout, emails and admin.
--
-- Slug cambodia-post-festival: the emails, Klaviyo and opsCcForTrip take the
-- country from the slug's first word, so guests read "Cambodia" and the
-- Cambodia team are copied in, with no per-trip code.
--
-- days = 5 because the end date is start + nights everywhere that doesn't know
-- the trip (tripNights, Klaviyo, the loyalty feed): 16 Dec + 5 = 21 Dec.
-- No start_weekday, so extend_weekly_departures never adds dates: the one
-- departure below is the only one. min_bookings_to_confirm 1: it runs whatever
-- the numbers, so nobody gets the under-5 heads-up. Code KRP goes into
-- booking references (SOL-KRP-001).
insert into public.trips
  (code, name, slug, days, default_price, default_strikethrough, start_weekday, active, activity_count, hero_video_url, stops, testimonials)
values
  ('KRP', 'Koh Rong Post-Festival Package', 'cambodia-post-festival', 5, 232, null, null, true, 2, null,
   '[
     {"name": "Koh Rong", "nights": 5, "photos": [], "activities": ["Transfer from Koh Sdach", "2 hours of free-flow beer, spirits and cocktails", "Koh Rong Boat Party (ticket + $10 bar credit)", "Nestival"], "description": "Five more nights on Koh Rong after the festival: Mad Monkey, daily breakfast, free flow on the first night, the Koh Rong Boat Party and Nestival."}
   ]'::jsonb,
   '[]'::jsonb)
on conflict (slug) do nothing;

insert into public.departures
  (trip_id, departure_code, departure_date, total_spots, spots_remaining, bookable, status, min_bookings_to_confirm, visibility, force_bookable)
select t.id, 'KRP-2026-12-16', date '2026-12-16', 40, 40, true, 'pending', 1, 'public', false
from public.trips t
where t.slug = 'cambodia-post-festival'
  and not exists (select 1 from public.departures d where d.trip_id = t.id and d.departure_date = date '2026-12-16');