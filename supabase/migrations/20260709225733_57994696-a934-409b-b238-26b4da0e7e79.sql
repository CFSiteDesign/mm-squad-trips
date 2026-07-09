CREATE OR REPLACE FUNCTION public.recompute_departure_status(_departure_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  SELECT COUNT(*)
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
$function$;

DROP POLICY IF EXISTS "Public can read departure_events" ON public.departure_events;
REVOKE SELECT ON public.departure_events FROM anon;
REVOKE SELECT ON public.departure_events FROM authenticated;
REVOKE ALL ON public.departure_events FROM anon;
REVOKE ALL ON public.departure_events FROM authenticated;
GRANT ALL ON public.departure_events TO service_role;