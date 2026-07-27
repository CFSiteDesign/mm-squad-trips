-- Applied via Lovable MCP on 2026-07-28 (guards make re-runs no-ops).
-- Stacked discounts + global cap (Michele, 27 Jul):
-- 1. stack_percent on a FIXED code = percent applied AFTER the fixed amount
--    comes off. E.g. $150 fixed + stack_percent 20 on an $850 trip:
--    (850 - 150) x 20% = $140 more off -> $290 total saving.
--    Messaging order is fixed-first, then % — matching the maths.
-- 2. app_config 'max_discount_usd' = safety cap on the TOTAL discount of any
--    checkout ($300 for now). Applies to every code type.
alter table public.discount_codes add column if not exists stack_percent numeric;

insert into public.app_config (key, value)
values ('max_discount_usd', '300')
on conflict (key) do update set value = excluded.value, updated_at = now();
