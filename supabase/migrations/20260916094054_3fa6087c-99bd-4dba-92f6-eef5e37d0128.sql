alter table public.bookings
  add column if not exists traveller_mode text;

alter table public.bookings
  drop constraint if exists bookings_traveller_mode_check;
alter table public.bookings
  add constraint bookings_traveller_mode_check
  check (traveller_mode is null or traveller_mode in ('independent', 'crew'));