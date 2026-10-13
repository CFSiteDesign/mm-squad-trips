-- WhatsApp trip-updates consent from the checkout box (Charlie, 13 Oct 2026):
-- "Keep me posted on WhatsApp. We'll send your day-by-day schedule, pickup
-- times and anything you need before you go. Trip updates only. Opt out
-- anytime." Unticked by default. Stored on the lead booking row with the time
-- it was given; klaviyo-sync subscribes the phone to WhatsApp transactional.
alter table public.bookings
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_opt_in_at timestamptz;
