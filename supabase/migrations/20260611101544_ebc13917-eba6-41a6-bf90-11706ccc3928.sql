
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS balance_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS balance_charged_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_status text,
  ADD COLUMN IF NOT EXISTS balance_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_last_error text,
  ADD COLUMN IF NOT EXISTS balance_next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id text;

CREATE INDEX IF NOT EXISTS bookings_balance_sched_idx
  ON public.bookings (balance_status, balance_next_attempt_at)
  WHERE balance_status IN ('scheduled','failed');
