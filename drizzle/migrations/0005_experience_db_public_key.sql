insert into public.app_config (key, value)
values ('experience_db_public_jwk', '{"kty":"EC","crv":"P-256","x":"K9Cequ7APKUNpJAC1h0fq9_pqWsxHXcyYC6NlTRCGT0","y":"063NgrXHEjAt8PCSjtDUYrvmxXpN3Wq1XIfNamXpmsI"}')
on conflict (key) do update set value = excluded.value, updated_at = now();