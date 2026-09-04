-- Adventure Advisors attribution.
--
-- Advisors share per-link tokens that 302 to /checkout?...&aa=<token>. The
-- token rides through the Stripe metadata and lands here on every booking
-- row of that checkout (commission is per traveller), so Adventure Advisors
-- can ask "which bookings came from this link" without us knowing which
-- advisor the token belongs to. Opaque text; their side resolves it.
--
-- Applied through Lovable on 3 Sep 2026; this file is the record of it.

alter table public.bookings add column if not exists advisor_ref text;

create index if not exists bookings_advisor_ref_idx
  on public.bookings (advisor_ref)
  where advisor_ref is not null;