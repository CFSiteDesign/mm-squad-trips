alter table public.booking_sheets add column if not exists drive_url text;
alter table public.booking_sheets alter column file_path drop not null;