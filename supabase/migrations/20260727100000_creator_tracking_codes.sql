-- Applied manually via Lovable MCP on 2026-07-27 (guards make re-runs no-ops).
-- Creator tracking codes: $0 discount codes flagged is_creator, carrying the
-- creator's display name + per-booking commission rates. Bookings made with
-- one enter the shared 7-Day Indonesia prize draw (window: bookings made
-- 15 Jul – 15 Sep 2026, enforced by expiry_date).
alter table public.discount_codes add column if not exists is_creator boolean not null default false;
alter table public.discount_codes add column if not exists creator_name text;
alter table public.discount_codes add column if not exists commission_7day numeric;
alter table public.discount_codes add column if not exists commission_12day numeric;

insert into public.discount_codes
  (code, discount_amount, discount_type, active, applicable_to, expiry_date, is_creator, creator_name, commission_7day, commission_12day)
values
  ('YELLOW4MADMONKEY', 0, 'fixed', true, array['All'], '2026-09-15', true, 'Yellow', 25, 50),
  ('CODE4MADMONKEY',   0, 'fixed', true, array['All'], '2026-09-15', true, 'Code',   25, 50),
  ('LYLO4MADMONKEY',   0, 'fixed', true, array['All'], '2026-09-15', true, 'LYLO',   25, 50)
on conflict do nothing;
