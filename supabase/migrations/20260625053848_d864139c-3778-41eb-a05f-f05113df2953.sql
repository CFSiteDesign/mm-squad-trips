
ALTER TABLE public.squad_leaders
  ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS society text;

ALTER TABLE public.squad_leaders
  DROP CONSTRAINT IF EXISTS squad_leaders_status_check;
ALTER TABLE public.squad_leaders
  ADD CONSTRAINT squad_leaders_status_check CHECK (status IN ('pending','approved','rejected'));
