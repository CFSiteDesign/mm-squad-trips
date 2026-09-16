-- Who a booking is for (Kyle, 16 Sep 2026): an independent traveller, whose
-- date always runs, or a crew traveller, who is waiting on 5 bookings.
-- Set from the "how are you travelling?" gate. Null for bookings made before
-- the gate (those fall back to lead_solo, i.e. one spot = guaranteed).
alter table public.bookings
  add column if not exists traveller_mode text;

alter table public.bookings
  drop constraint if exists bookings_traveller_mode_check;
alter table public.bookings
  add constraint bookings_traveller_mode_check
  check (traveller_mode is null or traveller_mode in ('independent', 'crew'));
