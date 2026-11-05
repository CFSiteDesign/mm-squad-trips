-- Trip builder: which parts of a booked trip the crew has booked (Ewan, 4 Nov 2026). Keys come from toBookList in _shared/trip-builder-book.ts.
alter table public.trip_builder_requests
  add column if not exists booked_items jsonb not null default '{}'::jsonb;
