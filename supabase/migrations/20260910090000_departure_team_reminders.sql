-- Property-team reminders 7 days and 1 day before each ALL IN departure
-- (Charlie, 10 Sep 2026). The edge function departure-team-reminders emails
-- the country GM list, reception@ and the Vietnam travel desks a manifest;
-- these stamps make each reminder go once per departure.
alter table public.departures
  add column if not exists team_reminder_7d_sent_at timestamptz,
  add column if not exists team_reminder_1d_sent_at timestamptz;

-- Daily at 01:00 UTC = 08:00 Indochina / 09:00 Bali. Same shape as the
-- quarterly-prize-draw job: the secret comes from the vault helper.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'departure-team-reminders') then
    perform cron.unschedule('departure-team-reminders');
  end if;
end $$;

select cron.schedule(
  'departure-team-reminders',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/departure-team-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);
