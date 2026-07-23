-- Applied manually via Lovable MCP on 2026-07-23 (guards make re-runs no-ops).
-- 1. Optional staff recommendation captured with each booking
alter table public.bookings add column if not exists staff_recommendation text;

-- 2. Percent discount codes: discount_type 'fixed' (default) | 'percent'
alter table public.discount_codes add column if not exists discount_type text not null default 'fixed';
do $$ begin
  alter table public.discount_codes add constraint discount_codes_type_check check (discount_type in ('fixed','percent'));
exception when duplicate_object then null; end $$;

-- 3. Month-restricted codes: departure month must be in this list (null = any month)
alter table public.discount_codes add column if not exists applicable_months integer[];

-- (Email logging already exists via email_send_log — no new table needed.)
