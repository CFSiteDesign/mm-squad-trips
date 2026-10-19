-- Key for loyalty-allin-bookings, the endpoint Dhany's Loyalty page calls for
-- a guest's ALL IN bookings (15 Oct 2026). Generated in the database so it
-- never sits in this public repo. Share it privately; rotate with one UPDATE.
insert into public.app_config (key, value)
values ('loyalty_api_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;
