-- Trip builder: pay the rest your way (Ewan, 20 Oct 2026).
-- Once the crew has approved a trip, the guest's deposit counts towards it and they choose how to pay the balance:
-- all now, charged to the card they paid the deposit with 7 days before they leave, or (when they leave 60+ days
-- from now) in instalments. Same shape as ALL IN bookings. See _shared/trip-builder-pay.ts for the rules.
--
-- pay_schedule is a jsonb array, one object per payment:
--   { n, amount, due 'YYYY-MM-DD', how 'checkout'|'card', status 'pending'|'paid'|'failed'|'gave_up',
--     attempts, last_error, retry_after, paid_at, payment_intent, reminded }
alter table public.trip_builder_requests
  add column if not exists stripe_customer_id text,           -- saved with the deposit (Checkout customer_creation + setup_future_usage)
  add column if not exists stripe_payment_method_id text,     -- the card the deposit was paid with
  add column if not exists pay_plan text check (pay_plan in ('now', 'later', 'instalments')),
  add column if not exists pay_schedule jsonb not null default '[]'::jsonb,
  add column if not exists plan_chosen_at timestamptz;

-- Daily at 03:00 UTC = 10:00 Indochina / 04:00 UK. Charges the card payments that are due and sends the 3-day reminders.
-- Same shape as the other jobs: the secret comes from the vault helper.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'charge-trip-builder-payments') then
    perform cron.unschedule('charge-trip-builder-payments');
  end if;
end $$;

select cron.schedule(
  'charge-trip-builder-payments',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/charge-trip-builder-payments',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', public.get_cron_secret()),
    body := '{}'::jsonb
  );
  $$
);
