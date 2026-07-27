-- Applied via Lovable MCP on 2026-07-28 (guards make re-runs no-ops).
-- True code stacking (Michele, 27 Jul): guests can combine TWO existing codes
-- in one checkout — one fixed + one percent — but only when BOTH codes have
-- stackable = true (the per-code safeguard switch). Maths: fixed off first,
-- then the % on the remainder ($150 + 20% on $850 = $290). Total discount
-- still capped by app_config 'max_discount_usd' ($300).
alter table public.discount_codes add column if not exists stackable boolean not null default false;
