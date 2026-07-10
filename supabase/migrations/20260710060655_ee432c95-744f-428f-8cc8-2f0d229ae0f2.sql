
-- PART A: Update existing departures
UPDATE public.departures d SET departure_date = v.new_date::date, departure_code = t.code || '-' || v.new_date
FROM (VALUES
  ('IND','2026-07','2026-07-25'),('IND','2026-08','2026-08-29'),('IND','2026-09','2026-09-26'),('IND','2026-10','2026-10-31'),('IND','2026-11','2026-11-28'),('IND','2026-12','2026-12-26'),
  ('CAM','2026-07','2026-07-30'),('CAM','2026-08','2026-08-27'),('CAM','2026-09','2026-09-24'),('CAM','2026-10','2026-10-29'),('CAM','2026-11','2026-11-26'),('CAM','2026-12','2026-12-31'),
  ('VIE','2026-07','2026-07-29'),('VIE','2026-08','2026-08-26'),('VIE','2026-09','2026-09-30'),('VIE','2026-10','2026-10-28'),('VIE','2026-11','2026-11-25'),('VIE','2026-12','2026-12-30')
) AS v(code, ym, new_date)
JOIN public.trips t ON t.code = v.code
WHERE d.trip_id = t.id AND to_char(d.departure_date, 'YYYY-MM') = v.ym;

-- PART B: Create two new 7-day trips
INSERT INTO public.trips (code, slug, name, days, activity_count, default_price, default_strikethrough, active, stops)
VALUES
('IND7','indonesia-7','ALL IN · 7 Day Gili T + Lombok',7,9,450.00,720.00,true,
 '[
   {"name":"Gili Trawangan","nights":3,"description":"Car-free island living at Mad Monkey''s secluded end of Gili T — pool, beach and the boat party the whole island talks about.","photos":["https://placehold.co/800x500/png?text=Gili+T"],"activities":["Mexican family welcome dinner","Gili T bucket-list bike tour","Pool party with live DJ","Mad Monkey Boat Party","Unlimited BBQ","Monkey Sea Monkey Do snorkelling"]},
   {"name":"Kuta Lombok","nights":4,"description":"Cross to Lombok and learn to surf — surf camp, dawn patrols, beach bonfires and one last DJ party night.","photos":["https://placehold.co/800x500/png?text=Lombok"],"activities":["Surf camp with instructors","Morning surf sessions","Photo analysis","Beach bonfire sunset","Surf-skate meet-up","DJ party night"]}
 ]'::jsonb),
('VIE7','vietnam-7','ALL IN · Vietnam Adventure',7,9,310.00,500.00,true,
 '[
   {"name":"Hanoi","nights":2,"description":"Old Quarter bia hoi, street food, egg coffee and Train Street with our local crew leading the way.","photos":["https://placehold.co/800x500/png?text=Hanoi"],"activities":["Welcome drinks + Old Quarter night","City tour: Hoan Kiem, St. Joseph''s, egg coffee, Train Street","Beer-street pub crawl"]},
   {"name":"Ha Giang Loop","nights":4,"description":"Four days on the legendary Loop with Easy Riders — Ma Pi Leng Pass, Lung Cu Flag Tower, homestays, karaoke and happy water.","photos":["https://placehold.co/800x500/png?text=Ha+Giang"],"activities":["VIP cabin bus to Ha Giang","The Loop with Easy Riders","Du Gia family dinner + karaoke","Ma Pi Leng Pass","Lung Cu Flag Tower — the top of Vietnam","Football with the Easy Riders","Hidden waterfalls ride home"]}
 ]'::jsonb);

-- PART C: Create departures for the new trips
INSERT INTO public.departures (trip_id, departure_date, departure_code, total_spots, spots_remaining, bookable, status, min_bookings_to_confirm)
SELECT t.id, v.d::date, t.code || '-' || v.d, 20, 20, true, 'pending', 5
FROM public.trips t
JOIN (VALUES
  ('IND7','2026-07-30'),('IND7','2026-08-27'),('IND7','2026-09-24'),('IND7','2026-10-29'),('IND7','2026-11-26'),('IND7','2026-12-31'),
  ('VIE7','2026-07-29'),('VIE7','2026-08-26'),('VIE7','2026-09-30'),('VIE7','2026-10-28'),('VIE7','2026-11-25'),('VIE7','2026-12-30')
) AS v(code, d) ON v.code = t.code;
