-- ALL IN · Thailand (Bangkok → Chiang Mai → Pai), from the 14 Sep 2026 brief.
-- Unlisted on the site (reachable at /thailand only) but a normal trip in the
-- database: same departures, booking and payment flow as the others.
-- Departs Tuesdays (Day 1 is a Tuesday in the brief); 11 days, 10 nights.
insert into public.trips
  (code, name, slug, days, default_price, default_strikethrough, start_weekday, active, activity_count, hero_video_url, stops, testimonials)
values
  ('THA', 'ALL IN · Thailand', 'thailand', 11, 340, null, 2, true, 12, null,
   '[
     {"name": "Bangkok", "nights": 2, "photos": [], "activities": ["Beats + Bingo welcome night", "Old Town tour: markets, temples & canals", "Bangkok Pub Crawl"], "description": "Temples, markets and canals by day; pub crawls and Beats + Bingo by night. The perfect chaotic warm-up."},
     {"name": "Chiang Mai", "nights": 4, "photos": [], "activities": ["Mad Monkey Day Party + BBQ dinner", "Chiang Mai Ultimate Pub Crawl", "Grand Canyon Water Park", "Ultimate Game Night", "Ethical elephant sanctuary + bamboo rafting", "Karaoke + mini pub crawl", "Bar Olympics + karaoke"], "description": "Elephants, bamboo rafting and the Grand Canyon water park, wrapped in day parties and game nights."},
     {"name": "Pai", "nights": 3, "photos": [], "activities": ["Sunset at Pai Canyon or Two Huts", "Pub quiz", "Tipsy tubing", "Karaoke night", "Lod Cave day tour", "Pai Pub Crawl"], "description": "Mountain sunsets, tubing, caves and that famous laid-back Pai magic, with a pub crawl or two."}
   ]'::jsonb,
   '[]'::jsonb)
on conflict (slug) do nothing;

-- Seed its weekly Tuesday departures now rather than waiting for Monday's cron.
select * from public.extend_weekly_departures(16);
