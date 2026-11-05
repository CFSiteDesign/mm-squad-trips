-- Stamp for the email 3 days before a balance is charged, so nobody gets it twice.
alter table public.bookings add column if not exists balance_heads_up_sent_at timestamptz;
