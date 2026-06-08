
-- =====================================================================
-- TRIPS
-- =====================================================================
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  days integer,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_count integer,
  hero_video_url text,
  video_testimonial_url text,
  default_price numeric(10,2) NOT NULL DEFAULT 0,
  default_strikethrough numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips public read" ON public.trips FOR SELECT USING (true);

-- =====================================================================
-- DEPARTURES
-- =====================================================================
CREATE TABLE public.departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  departure_code text,
  departure_date date NOT NULL,
  total_spots integer NOT NULL DEFAULT 0,
  spots_remaining integer NOT NULL DEFAULT 0,
  bookable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, departure_date)
);
CREATE INDEX departures_trip_date_idx ON public.departures(trip_id, departure_date);
GRANT SELECT ON public.departures TO anon, authenticated;
GRANT ALL ON public.departures TO service_role;
ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departures public read" ON public.departures FOR SELECT USING (true);

-- =====================================================================
-- PRICING CALENDAR
-- =====================================================================
CREATE TABLE public.pricing_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  month text NOT NULL, -- format "YYYY-MM"
  price numeric(10,2) NOT NULL,
  strikethrough numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, month)
);
GRANT SELECT ON public.pricing_calendar TO anon, authenticated;
GRANT ALL ON public.pricing_calendar TO service_role;
ALTER TABLE public.pricing_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_calendar public read" ON public.pricing_calendar FOR SELECT USING (true);

-- =====================================================================
-- DISCOUNT CODES
-- =====================================================================
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expiry_date date,
  applicable_to text[] NOT NULL DEFAULT ARRAY['All']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
-- no public policies → only service_role can access

-- =====================================================================
-- BOOKINGS
-- =====================================================================
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  departure_id uuid REFERENCES public.departures(id) ON DELETE SET NULL,
  booking_type text,                 -- 'Solo' | 'Group lead' | 'Group member'
  group_id text,                     -- 'GRP-IND-001' etc.
  group_size integer NOT NULL DEFAULT 1,
  spot_number integer NOT NULL DEFAULT 1,
  friend_names_mentioned text,
  lead_name text,
  lead_email text,
  lead_phone text,
  lead_country text,
  lead_age integer,
  lead_solo boolean,
  lead_source text,
  additional_travelers jsonb,
  payment_type text,                 -- 'Deposit' | 'Full'
  original_price numeric(10,2),
  discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  final_price numeric(10,2),
  amount_paid numeric(10,2),
  status text NOT NULL DEFAULT 'Confirmed',
  stripe_session_id text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  group_members uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_session_id, spot_number)
);
CREATE INDEX bookings_session_idx ON public.bookings(stripe_session_id);
CREATE INDEX bookings_departure_idx ON public.bookings(departure_id);
CREATE INDEX bookings_discount_idx ON public.bookings(discount_code_id);
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- no public policies → only service_role can access

-- =====================================================================
-- updated_at trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_departures_updated_at BEFORE UPDATE ON public.departures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pricing_updated_at BEFORE UPDATE ON public.pricing_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_discount_updated_at BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- Recompute spots_remaining + discount used_count
-- =====================================================================
CREATE OR REPLACE FUNCTION public.recompute_departure_spots(_departure_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF _departure_id IS NULL THEN RETURN; END IF;
  UPDATE public.departures d
  SET spots_remaining = GREATEST(0, d.total_spots - (
    SELECT COUNT(*) FROM public.bookings b
    WHERE b.departure_id = _departure_id
      AND b.status = 'Confirmed'
  ))
  WHERE d.id = _departure_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_discount_used(_discount_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF _discount_id IS NULL THEN RETURN; END IF;
  UPDATE public.discount_codes c
  SET used_count = (
    SELECT COUNT(DISTINCT b.stripe_session_id) FROM public.bookings b
    WHERE b.discount_code_id = _discount_id
      AND b.status = 'Confirmed'
  )
  WHERE c.id = _discount_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bookings_sync_counters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_departure_spots(OLD.departure_id);
    PERFORM public.recompute_discount_used(OLD.discount_code_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.recompute_departure_spots(OLD.departure_id);
    PERFORM public.recompute_discount_used(OLD.discount_code_id);
    PERFORM public.recompute_departure_spots(NEW.departure_id);
    PERFORM public.recompute_discount_used(NEW.discount_code_id);
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.recompute_departure_spots(NEW.departure_id);
    PERFORM public.recompute_discount_used(NEW.discount_code_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_bookings_sync_counters
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bookings_sync_counters();
