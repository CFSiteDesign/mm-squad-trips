
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_ref text;

-- Backfill: groups inherit their group_id
UPDATE public.bookings SET booking_ref = group_id WHERE group_id IS NOT NULL AND booking_ref IS NULL;

-- Backfill: solos get SOL-<trip-code>-NNN numbered per trip in created order
WITH ranked AS (
  SELECT b.id,
    COALESCE(UPPER(t.code), 'XXX') AS tcode,
    ROW_NUMBER() OVER (PARTITION BY b.trip_id ORDER BY b.created_at, b.id) AS rn
  FROM public.bookings b
  LEFT JOIN public.trips t ON t.id = b.trip_id
  WHERE b.group_id IS NULL AND b.booking_ref IS NULL
)
UPDATE public.bookings b
SET booking_ref = 'SOL-' || ranked.tcode || '-' || LPAD(ranked.rn::text, 3, '0')
FROM ranked
WHERE b.id = ranked.id;

CREATE INDEX IF NOT EXISTS bookings_booking_ref_idx ON public.bookings(booking_ref);
