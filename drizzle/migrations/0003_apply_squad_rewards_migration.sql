-- Squad leader rewards applied automatically (Charlie, 14 Oct 2026): 50% off
-- the leader's own spot at 3 mates, the other 50% at 6. One row per reward
-- step per leader, written by _shared/squad-reward.ts. A step's value comes
-- off the leader's unpaid balance on its own; anything left over is a refund
-- to their card, which waits for Approve in Squad admin.
create table if not exists public.squad_rewards (
  id uuid primary key default gen_random_uuid(),
  squad_leader_id uuid not null references public.squad_leaders(id) on delete cascade,
  tier text not null check (tier in ('half', 'free')),
  status text not null default 'processing'
    check (status in ('processing', 'waiting_booking', 'applied', 'awaiting_approval', 'declined', 'failed')),
  mates_at_unlock integer not null default 0,
  booking_id uuid references public.bookings(id) on delete set null,
  booking_ref text,
  amount numeric(10,2) not null default 0,
  balance_cut numeric(10,2) not null default 0,
  refund_due numeric(10,2) not null default 0,
  refunded numeric(10,2) not null default 0,
  stripe_refund_ids text[] not null default '{}',
  last_error text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (squad_leader_id, tier)
);
grant all on public.squad_rewards to service_role;
alter table public.squad_rewards enable row level security;
-- No policies: only service_role (edge functions) can access.

-- Squad admin can point a leader at their booking when they booked under a
-- different email from the one on their squad.
alter table public.squad_leaders
  add column if not exists reward_booking_ref text;