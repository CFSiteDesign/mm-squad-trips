
-- 1. Departures: status fields
ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_bookings_to_confirm integer NOT NULL DEFAULT 5;

ALTER TABLE public.departures
  DROP CONSTRAINT IF EXISTS departures_status_check;
ALTER TABLE public.departures
  ADD CONSTRAINT departures_status_check CHECK (status IN ('pending','confirmed','cancelled'));

-- 2. Bookings: per-guest notification timestamps
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS trip_confirmed_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_7d_sent_at timestamptz;

-- 3. departure_events queue
CREATE TABLE IF NOT EXISTS public.departure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  processed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS departure_events_unprocessed_idx
  ON public.departure_events (created_at)
  WHERE processed_at IS NULL;

GRANT SELECT ON public.departure_events TO anon, authenticated;
GRANT ALL ON public.departure_events TO service_role;

ALTER TABLE public.departure_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read departure_events" ON public.departure_events;
CREATE POLICY "Public can read departure_events"
  ON public.departure_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Recompute departure status function
CREATE OR REPLACE FUNCTION public.recompute_departure_status(_departure_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _confirmed_count integer;
  _min integer;
  _current_status text;
BEGIN
  IF _departure_id IS NULL THEN RETURN; END IF;

  SELECT status, min_bookings_to_confirm
    INTO _current_status, _min
  FROM public.departures
  WHERE id = _departure_id;

  IF _current_status IS NULL OR _current_status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT COUNT(DISTINCT stripe_session_id)
    INTO _confirmed_count
  FROM public.bookings
  WHERE departure_id = _departure_id
    AND status = 'Confirmed';

  IF _confirmed_count >= _min THEN
    UPDATE public.departures
      SET status = 'confirmed', confirmed_at = now()
      WHERE id = _departure_id AND status = 'pending';

    INSERT INTO public.departure_events (departure_id, event_type, payload)
    VALUES (_departure_id, 'confirmed', jsonb_build_object('bookings', _confirmed_count));
  END IF;
END;
$$;

-- 5. Wire into the existing bookings_sync_counters trigger
CREATE OR REPLACE FUNCTION public.bookings_sync_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_departure_spots(OLD.departure_id);
    PERFORM public.recompute_discount_used(OLD.discount_code_id);
    PERFORM public.recompute_departure_status(OLD.departure_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_departure_spots(OLD.departure_id);
    PERFORM public.recompute_discount_used(OLD.discount_code_id);
    PERFORM public.recompute_departure_spots(NEW.departure_id);
    PERFORM public.recompute_discount_used(NEW.discount_code_id);
    PERFORM public.recompute_departure_status(NEW.departure_id);
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.recompute_departure_spots(NEW.departure_id);
    PERFORM public.recompute_discount_used(NEW.discount_code_id);
    PERFORM public.recompute_departure_status(NEW.departure_id);
    RETURN NEW;
  END IF;
END;
$function$;

-- 6. Backfill: confirm any departures already at the threshold
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.departures WHERE status = 'pending'
  LOOP
    PERFORM public.recompute_departure_status(r.id);
  END LOOP;
END $$;
