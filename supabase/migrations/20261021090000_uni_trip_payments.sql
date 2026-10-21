-- Uni trip payments (Charlie and Ewan, 21 Oct 2026). The uni trip lives in
-- UNI Advisors (the concierge, a different Supabase project) and stays separate
-- from ALL IN trips, but it takes its money through this site's Stripe so it can
-- go live without a second Stripe account. UNI Advisors calls uni-trip-pay
-- (guarded by app_config('uni_advisors_api_key')) to open a payment, charge a
-- saved card or refund; stripe-webhook relays paid sessions back to UNI Advisors.
--
-- This table is a log of that money for audit and support only. Uni payments
-- never create ALL IN bookings, so no ALL IN emails, Klaviyo, squads, leaderboard,
-- creator commission, Loyalty feed or balance job ever see them. The bookings,
-- schedule and commission themselves live in UNI Advisors.
create table if not exists public.uni_trip_payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('checkout', 'charge', 'refund')),
  status text not null,
  purpose text,                  -- deposit | instalments | extra | instalment | refund
  uni_booking_id uuid not null,  -- trip_bookings.id in UNI Advisors
  uni_payment_ids text,          -- trip_payments ids in UNI Advisors, comma separated
  uni_slug text,
  amount_pence integer not null check (amount_pence >= 0),
  currency text not null default 'gbp',
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_refund_id text,
  stripe_customer_id text,
  error text,
  relayed_at timestamptz,        -- when UNI Advisors confirmed it got the paid session
  relay_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists uni_trip_payments_booking_idx on public.uni_trip_payments (uni_booking_id, created_at desc);
grant all on public.uni_trip_payments to service_role;
alter table public.uni_trip_payments enable row level security;
-- No policies: only the Edge Functions (service role) read or write it.
