# Migrate Airtable → Lovable Cloud + /admin

Full cutover. Postgres becomes the only source of truth. Existing Airtable data is imported once. Stripe checkout keeps its current dynamic pricing flow.

## 1. Database schema (one migration)

Five new tables in Postgres mirroring the Airtable structure:

- **`trips`** — code, name, slug (unique), days, stops (jsonb), testimonials (jsonb), activity_count, hero_video_url, video_testimonial_url, default_price, default_strikethrough, active.
- **`departures`** — trip_id (fk → trips), departure_code, departure_date, total_spots, spots_remaining, bookable. Unique (trip_id, departure_date).
- **`pricing_calendar`** — trip_id (fk), month (text "YYYY-MM"), price, strikethrough, active. Unique (trip_id, month).
- **`discount_codes`** — code (unique, upper), discount_amount (numeric), active, usage_limit, used_count, expiry_date, applicable_to (text[] of slugs or "All").
- **`bookings`** — trip_id, departure_id, booking_type, group_id, group_size, spot_number, lead/traveler fields, additional_travelers (jsonb), payment fields, status, stripe_session_id (unique), utm fields. Trigger keeps `departures.spots_remaining` and `discount_codes.used_count` in sync on insert/update/delete.

RLS:
- `trips`, `departures`, `pricing_calendar` → public SELECT (anon + authenticated); writes only via `service_role`.
- `discount_codes`, `bookings` → no public access; only `service_role`.

GRANTs follow the standard rules.

## 2. Admin auth (single password)

- New edge function `admin-verify` — accepts a password, compares to `ADMIN_PASSWORD` secret, returns a short-lived signed token (HMAC of `exp|nonce` using `ADMIN_PASSWORD`).
- New edge function `admin-api` — verifies the token on every request, exposes CRUD for the five tables (list/create/update/delete) using the service role client.
- Tokens live in `sessionStorage` only; expire in 8 h.

## 3. `/admin` page

- Login screen → password field.
- Once authenticated, a tabbed UI with one tab per table (Trips, Departures, Pricing, Discounts, Bookings).
- Each tab: searchable/sortable data table + side-panel form for create/edit, delete with confirm.
- Bookings tab is read-only with CSV export.
- "Import from Airtable" button (visible only until first import succeeds) calls a one-shot `admin-import-airtable` edge function.

## 4. Airtable → Postgres importer

- New edge function `admin-import-airtable` (admin-token guarded). Pulls every record from Trips, Departures, Pricing Calendar, Discount Codes, Bookings via the existing connector and inserts them into Postgres in dependency order, mapping Airtable record IDs to new UUIDs and remapping the link columns.
- Idempotent: uses `ON CONFLICT` on natural keys (slug, departure_date+trip, code, stripe_session_id).

## 5. Rewrite edge functions to use Postgres

Replace every `airtableGet/Create/Patch` call:

- `trips-get` → SELECT trip + departures by slug.
- `departure-spots` → SELECT spots_remaining for one departure.
- `validate-discount` → SELECT discount_codes by code with the same expiry/usage/applicability checks.
- `create-checkout-session` → all four lookups (trip, departure, pricing, discount) come from Postgres. Stripe flow itself is unchanged — same dynamic `price_data`, same coupon for full-price discounts.
- `stripe-webhook` → writes booking rows to Postgres in a single transaction; the trigger updates `spots_remaining` and `used_count` automatically. Squad-leader credit logic preserved.
- `booking-lookup` → SELECT from bookings by session id.
- `debug-departures` → SELECT recent departures (kept for diagnostics).
- Delete `supabase/functions/_shared/airtable.ts` once nothing imports it.

## 6. Stripe link impact

No URL or product changes. The user-facing checkout still:
1. Posts the same payload to `create-checkout-session`.
2. Gets back a Stripe Checkout URL.
3. Webhook still fires `checkout.session.completed` and writes the booking.

What changes under the hood:
- Price/discount lookups are a few ms instead of 3 Airtable round-trips, so checkout starts faster.
- `bookings` insert + spots/used-count update happen in one DB transaction — no more race risk and no Airtable rate limits.
- Stripe price IDs / payment links aren't introduced (you chose dynamic pricing), so nothing in your Stripe dashboard needs reconfiguring.

## 7. Cleanup

- Remove Airtable connector usage from code.
- Keep the `AIRTABLE_API_KEY` connection linked for a week as a safety net, then disconnect once the new flow is proven.
- `src/data/pricingCalendar.ts` and `src/data/tripFallbacks.ts` stay as instant-render fallbacks (they don't need Airtable either way).

## Technical notes

- One large migration covers all five tables, GRANTs, RLS policies, and the spots/used-count trigger.
- Token verification is done in-function with `crypto.subtle` HMAC — no extra dependency.
- The importer is rerunnable; safe to call again if a table fails partway through.
- Stripe `apiVersion` stays on `2025-08-27.basil`.
- Existing `squad_leaders` / `squad_bookings` tables are untouched; the webhook keeps writing to them.

## Rollout order

1. Run migration → user approves.
2. Deploy `admin-verify`, `admin-api`, `admin-import-airtable`.
3. Ship `/admin` page; you log in and click "Import from Airtable".
4. Verify imported data looks right in `/admin`.
5. Replace the 7 Airtable-dependent edge functions with the Postgres versions in a single deploy.
6. Smoke-test a real Stripe checkout end-to-end (already supported via Stripe test mode).
7. Disconnect the Airtable connector once you're happy.
