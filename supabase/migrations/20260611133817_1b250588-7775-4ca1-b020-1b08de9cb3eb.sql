create or replace function public.normalize_cron_secret(_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when _value is null then ''
    when btrim(_value) ~ '^[0-9A-Fa-f]{64}$' then lower(btrim(_value))
    else btrim(_value)
  end
$$;

grant execute on function public.normalize_cron_secret(text) to anon;
grant execute on function public.normalize_cron_secret(text) to authenticated;
grant execute on function public.normalize_cron_secret(text) to service_role;