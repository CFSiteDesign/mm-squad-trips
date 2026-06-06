
CREATE TABLE public.squad_leaders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  instagram TEXT,
  preferred_trip_slug TEXT,
  preferred_month TEXT,
  reason TEXT,
  code TEXT NOT NULL UNIQUE,
  access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.squad_leaders TO service_role;
ALTER TABLE public.squad_leaders ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) can access.

CREATE TABLE public.squad_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_leader_id UUID NOT NULL REFERENCES public.squad_leaders(id) ON DELETE CASCADE,
  booker_name TEXT,
  booker_email TEXT,
  trip_slug TEXT,
  departure_date DATE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX squad_bookings_leader_idx ON public.squad_bookings(squad_leader_id);
GRANT ALL ON public.squad_bookings TO service_role;
ALTER TABLE public.squad_bookings ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) can access.
