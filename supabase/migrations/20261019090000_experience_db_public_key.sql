-- Public key of the Experience Database's allin-sync (19 Oct 2026). loyalty-allin-bookings accepts requests signed
-- with the matching private key, which never leaves the Experience Database; this half is public by design. If
-- allin-sync's key pair is ever replaced, update this value with the new public key.
insert into public.app_config (key, value)
values ('experience_db_public_jwk', '{"kty":"EC","crv":"P-256","x":"K9Cequ7APKUNpJAC1h0fq9_pqWsxHXcyYC6NlTRCGT0","y":"063NgrXHEjAt8PCSjtDUYrvmxXpN3Wq1XIfNamXpmsI"}')
on conflict (key) do update set value = excluded.value, updated_at = now();
