-- Booking sheets as Google Drive links (Charlie, 26 Nov 2026): revenue paste the
-- Drive link to the booking endorsement instead of uploading the Excel/PDF.
-- The sheet stays in Drive and Drive's sharing decides who can open it.
--
-- Additive only. file_path (the old upload path) is kept but no longer required;
-- no file was ever uploaded, and the empty private "booking-sheets" bucket stays.
-- The table keeps its grants and RLS (service role only, no policies).

alter table public.booking_sheets add column if not exists drive_url text;
alter table public.booking_sheets alter column file_path drop not null;
