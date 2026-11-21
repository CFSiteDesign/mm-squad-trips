-- ALL IN trip names (Charlie, 21 Nov 2026): "<Country> Ultimate" for the longer trips, "<Country> Essentials"
-- for the shorter ones. The names were all over the place ("Cambodia Coast to Coast", "ALL IN · 7 Day Gili T +
-- Lombok"), and the departure email already adds "ALL IN · " in front, so these carry no prefix.
-- Klaviyo is unchanged: klaviyo-sync builds allin_trip_name itself ("Vietnam 14 Days"), which Mich's lists use.
-- The Koh Rong Post-Festival Package keeps its name.
update public.trips t set name = v.name
from (values
  ('indonesia',   'Indonesia Ultimate'),
  ('indonesia-7', 'Indonesia Essentials'),
  ('vietnam',     'Vietnam Ultimate'),
  ('vietnam-7',   'Vietnam Essentials'),
  ('cambodia',    'Cambodia Ultimate'),
  ('thailand',    'Thailand Ultimate'),
  ('laos',        'Laos Ultimate')
) as v(slug, name)
where t.slug = v.slug;
