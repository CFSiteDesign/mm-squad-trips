-- lovable-cron-fallback-reviewed: klaviyo outbox drain every 15 min is the intended cadence per the migration file; 96 runs/day, required timing preserved.
-- ALL IN -> Klaviyo (plan v0, 23 Sep 2026). Ships switched OFF.
--
-- Nothing here changes how bookings work. The lifecycle functions append a
-- row to klaviyo_outbox at each moment worth telling Klaviyo about; the
-- klaviyo-sync function drains it every 15 minutes according to
-- app_config('klaviyo_mode'):
--   off      nothing is sent, the outbox just accumulates          (default)
--   dry_run  payloads are built and reported, nothing is sent
--   test     only emails in klaviyo_test_emails are sent, to klaviyo_list_test
--   live     everyone, to the trip's list
-- Flipping the mode is a config row, not a deploy.

alter table public.bookings
  add column if not exists klaviyo_synced_at timestamptz,
  add column if not exists klaviyo_last_error text;

create table if not exists public.klaviyo_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_session text not null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz
);
create index if not exists klaviyo_outbox_pending_idx on public.klaviyo_outbox (created_at) where status = 'pending';
create index if not exists klaviyo_outbox_session_idx on public.klaviyo_outbox (booking_session);

-- Service role only, like the other internal tables.
alter table public.klaviyo_outbox enable row level security;

insert into public.app_config (key, value) values
  ('klaviyo_mode', 'off'),
  ('klaviyo_test_emails', ''),
  ('klaviyo_list_test', ''),
  ('klaviyo_list_vietnam', ''),
  ('klaviyo_list_vietnam-7', ''),
  ('klaviyo_list_cambodia', ''),
  ('klaviyo_list_indonesia', ''),
  ('klaviyo_list_indonesia-7', ''),
  ('klaviyo_list_thailand', '')
on conflict (key) do nothing;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'klaviyo-sync') then
    perform cron.unschedule('klaviyo-sync');
  end if;
end $$;

select cron.schedule(
  'klaviyo-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/klaviyo-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);