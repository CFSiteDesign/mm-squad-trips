ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS stripe_balance_refund_id text;

ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;