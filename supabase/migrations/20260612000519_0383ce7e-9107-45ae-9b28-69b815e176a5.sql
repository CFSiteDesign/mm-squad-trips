ALTER TABLE public.squad_leaders
  ADD COLUMN IF NOT EXISTS reset_token text,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS squad_leaders_reset_token_idx ON public.squad_leaders(reset_token);