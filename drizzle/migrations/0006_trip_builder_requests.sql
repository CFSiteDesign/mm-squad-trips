-- Trip builder requests (Charlie, 19 Oct 2026). Ewan's trip builder lives at
-- /trip-builder on the ALL IN site. Sending a trip for checking takes a $50 per
-- person deposit on Stripe (trip-builder-request); the payment webhook marks it
-- paid and the crew works it in the admin (Trip builder tab, trip-builder-admin):
-- checking, then a balance link, or declined with the deposit refunded.
-- Statuses: pending_payment -> submitted -> checking -> ready -> approved, or declined.
create table if not exists public.trip_builder_requests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'submitted', 'checking', 'ready', 'approved', 'declined')),
  name text not null,
  contact_via text,
  email text,
  whatsapp text,
  from_place text,
  party_size integer not null default 1 check (party_size between 1 and 8),
  dates_flex text,
  start_date date,
  route text,
  days integer,
  nights integer,
  stops text[] not null default '{}',
  countries text[] not null default '{}',
  est_total_usd numeric(10,2),
  all_in_match text,
  trip_link text,
  itinerary text,
  notes text,
  campaign_ref text,
  from_hostel text,
  payload jsonb not null,
  deposit_amount numeric(10,2) not null,
  deposit_session_id text,
  deposit_url text,
  deposit_payment_intent text,
  deposit_paid_at timestamptz,
  guest_email text,            -- from Stripe Checkout, so guests who chose WhatsApp still get receipts
  hold_until timestamptz,
  balance_amount numeric(10,2),
  balance_session_id text,
  balance_url text,
  balance_payment_intent text,
  balance_paid_at timestamptz,
  refund_id text,
  refunded_at timestamptz,
  crew_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_builder_requests_status_idx on public.trip_builder_requests (status, created_at desc);
grant all on public.trip_builder_requests to service_role;
alter table public.trip_builder_requests enable row level security;
-- No policies: only the Edge Functions (service role) read or write it.