
CREATE TABLE public.email_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  template_name text NOT NULL DEFAULT 'unknown',
  recipient_email text NOT NULL,
  cc text,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error_message text,
  metadata jsonb
);
CREATE INDEX email_send_log_created_at_idx ON public.email_send_log (created_at DESC);
CREATE INDEX email_send_log_recipient_idx ON public.email_send_log (recipient_email);
CREATE INDEX email_send_log_template_idx ON public.email_send_log (template_name);
GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
