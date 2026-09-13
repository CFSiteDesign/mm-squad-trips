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

select * from public.extend_weekly_departures(16);