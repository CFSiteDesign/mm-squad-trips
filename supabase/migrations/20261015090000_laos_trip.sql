-- ALL IN · Laos Ultimate (Luang Prabang → Nong Khiaw → Muang Ngoi → Luang
-- Prabang → Vang Vieng), from the 15 Oct 2026 dev spec. A normal trip: same
-- departures, booking and payment flow as the others.
-- Departs Sundays; 10 days, 9 nights (7 at Mad Monkey, a mountain camp, a
-- homestay); from $400. The code follows the database's short style (THA,
-- CAM...) because it goes into booking references; the page shows LAOS10.
insert into public.trips
  (code, name, slug, days, default_price, default_strikethrough, start_weekday, active, activity_count, hero_video_url, stops, testimonials)
values
  ('LAO', 'ALL IN · Laos Ultimate', 'laos', 10, 400, null, 0, true, 14, null,
   '[
     {"name": "Luang Prabang", "nights": 4, "photos": [], "activities": ["Kuang Si Falls tour", "Stories of Luang Prabang culture tour", "Jewellery making at the Garden of Eden", "Bowling night"], "description": "Swim the turquoise pools of Kuang Si Falls, wander the golden temples and the night market, and take the culture tour of the National Museum, UXO Centre and Royal Palace."},
     {"name": "Nong Khiaw", "nights": 1, "photos": [], "activities": ["Mountain viewpoint hike", "Mountain-top camp"], "description": "A road trip north, a local museum and a mountain viewpoint hike, then a night camping on the mountain top."},
     {"name": "Muang Ngoi", "nights": 1, "photos": [], "activities": ["Boat to a Khmu village and waterfall", "Muang Ngoi viewpoint climb", "Village homestay"], "description": "River boats upriver to car-free Muang Ngoi for a viewpoint climb and a night in a village homestay."},
     {"name": "Vang Vieng", "nights": 3, "photos": [], "activities": ["Sunset tandem paramotor flight", "Vang Vieng pub crawl", "Blue Lagoons, Nang Far Cave and kayaking day tour", "Zipline and the Phakai viewpoint", "Tipsy tubing on the Nam Song"], "description": "The high-speed train south, a sunset paramotor flight over the karsts, the Blue Lagoons, caves, kayaking, ziplines and tubing, and the pub crawl."}
   ]'::jsonb,
   '[]'::jsonb)
on conflict (slug) do nothing;

-- Klaviyo list for Laos bookers, filled in when the list exists (like the others).
insert into public.app_config (key, value) values ('klaviyo_list_laos', '')
on conflict (key) do nothing;

-- Seed its weekly Sunday departures now rather than waiting for Monday's cron.
select * from public.extend_weekly_departures(16);
