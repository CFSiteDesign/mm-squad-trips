-- Crew heads-up 10 days before an under-filled departure (Charlie, 6 Oct 2026).
-- Crew trips now run even if they don't reach 5; cancel-underfilled-departures
-- no longer cancels departures that have bookings. The edge function
-- underfilled-crew-notice emails each crew lead booker once; this stamp is
-- what makes it once.
alter table public.bookings
  add column if not exists underfill_notice_sent_at timestamptz;

-- Daily at 02:00 UTC = 09:00 Indochina / 10:00 Bali. Same shape as the
-- departure-team-reminders job: the secret comes from the vault helper.
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
