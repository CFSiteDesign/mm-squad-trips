-- The Gili T snorkel tour on the Indonesia trips is now "Three Turtles Snorkeling" (Charlie, 23 Nov 2026;
-- the hostel renamed the tour "Monkey Sea, Monkey Do Snorkeling Tour" to "Three Turtles Snorkeling Tour" the same day).
-- Only Indonesia Essentials' stops still carried the old name.
update public.trips
set stops = regexp_replace(stops::text, 'Monkey Se[ae],? Monkey Do snorkell?ing', 'Three Turtles Snorkeling', 'gi')::jsonb
where stops::text ~* 'monkey se[ae],? monkey do';
