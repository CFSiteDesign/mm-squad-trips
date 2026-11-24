create table if not exists public.booking_sheets (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null,
  file_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

revoke all on table public.booking_sheets from anon, authenticated;
grant all on table public.booking_sheets to service_role;

create index if not exists booking_sheets_booking_ref_idx on public.booking_sheets (booking_ref);

alter table public.booking_sheets enable row level security;