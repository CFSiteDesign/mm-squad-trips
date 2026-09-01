-- "Talk to an advisor" enquiries.
--
-- Replaces the custom-date request on the trip pages: people leave a WhatsApp
-- number or an email and nothing else, and it lands in this database alongside
-- the bookings rather than in somebody's inbox.
--
-- Already applied to the shared Supabase project on 1 Sep 2026; this file is
-- the record of it.

create table if not exists public.advisor_enquiries (
  id uuid primary key default gen_random_uuid(),
  trip_slug text,
  trip_name text,
  contact_method text not null check (contact_method in ('whatsapp', 'email')),
  contact_value text not null,
  note text,
  -- Where the enquiry came from, so preview traffic can be told apart from live.
  source text not null default 'preview',
  created_at timestamptz not null default now()
);

alter table public.advisor_enquiries enable row level security;

-- Insert only, and deliberately no select policy: the publishable key is in the
-- browser bundle, so anyone can leave an enquiry but nobody can read the list
-- back out. Reading is service-role / admin only.
drop policy if exists "anon can leave an enquiry" on public.advisor_enquiries;
create policy "anon can leave an enquiry"
  on public.advisor_enquiries
  for insert
  to anon, authenticated
  with check (true);

create index if not exists advisor_enquiries_created_at_idx
  on public.advisor_enquiries (created_at desc);
