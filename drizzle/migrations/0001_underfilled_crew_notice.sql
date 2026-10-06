alter table public.bookings
  add column if not exists underfill_notice_sent_at timestamptz;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'underfilled-crew-notice') then
    perform cron.unschedule('underfilled-crew-notice');
  end if;
end $$;

select cron.schedule(
  'underfilled-crew-notice',
  '0 2 * * *',
  $$
  select net.http_post(
    url := 'https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/underfilled-crew-notice',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);