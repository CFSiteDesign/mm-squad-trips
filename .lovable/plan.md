## Stack & architecture (honors "no Postgres, no CMS, no admin")

- **Frontend:** Vite + React + Tailwind + shadcn (already in repo). React Router for `/indonesia`, `/cambodia`, `/vietnam`, `/booking-success`.
- **Backend:** Lovable Cloud **edge functions only**. No Postgres tables created. No auth. No admin UI. Cloud is used purely as the serverless runtime + secrets vault for Airtable/Stripe/Resend keys. Brief says "Next.js API routes" — we'll mirror those as edge functions: `trips-get`, `validate-discount`, `create-checkout-session`, `stripe-webhook`, `departure-spots`.
- **Data:** Airtable, via the gateway connector. All reads/writes happen server-side from edge functions using `AIRTABLE_API_KEY` + `AIRTABLE_BASE_ID`.
- **Payments:** Stripe Checkout (hosted) + webhook.
- **Email:** Resend, templates 1 (confirmation) and 2 (balance reminder via cron) — brief defers 3–6 to v1.1.

## Prerequisites you'll need to provide (asked before code)

1. **Enable Lovable Cloud** (one click) — required for edge functions + secrets.
2. **Connect Airtable** via the connector. I'll then need `AIRTABLE_BASE_ID`.
3. **Stripe** test-mode `STRIPE_SECRET_KEY` and (after deploying webhook) `STRIPE_WEBHOOK_SECRET`.
4. **Resend** `RESEND_API_KEY` and a verified `from` address.
5. **Airtable base** built out per Section 7 of the brief (6 tables, exact field names). I'll generate a step-by-step setup doc you can follow in ~30 min, plus the 21 Pricing Calendar rows and 42 Departures as CSVs you can import.
6. **`SUPPORT_WHATSAPP`** number and a placeholder hero video URL per trip (Cloudinary/Mux/Vercel Blob, max 10MB).

## Build order (mirrors brief's Day 1–10, compressed)

### Phase 1 — Foundations
- Reset the half-built SaaS landing (current `Index.tsx` is empty; `index.html` + `index.css` need to pivot to Mad Monkey branding).
- Tailwind theme: design tokens for hero/trust palette + spot-badge color ramp (green → amber → orange → red → grey).
- Routes: `/`, `/indonesia`, `/cambodia`, `/vietnam`, `/booking-success`. Index page = simple chooser of the 3 trips.

### Phase 2 — Airtable setup deliverable
- Markdown doc: schema for all 6 tables with exact field names/types.
- CSV seeds: Trips (3), Pricing Calendar (21), Departures (42).
- JSON placeholder for Stops + Testimonials per trip.

### Phase 3 — Edge functions
- `trips-get/:slug` → Trip + active future departures + resolved current price per departure.
- `validate-discount` → checks active/expiry/usage/applicability; never stacks.
- `departure-spots/:id` → live `Spots Remaining`.
- `create-checkout-session` → **server-side `resolvePrice()`** (lookup Trip → Pricing Calendar by `YYYY-MM` of departure → apply discount → × group size → 60-day rule → deposit vs full). Re-checks `Bookable?` and `Spots Remaining ≥ groupSize`. Creates Stripe session; passes metadata (tripSlug, departureId, groupSize, travelers, leadBooker, discountCode, utm, friendsMentioned, resolved-price snapshot).
- `stripe-webhook` → verifies signature, **idempotent on Stripe session ID** (unique in Airtable), writes Booking row(s), generates `GRP-XXX-NNN` for group bookings, triggers Resend confirmation.

### Phase 4 — Trip page (single component, three slugs)
Section order from brief:
1. Hero (video, fixed headline, dynamic subhead, price + strikethrough, deposit/pay-in-full line, "Pick your dates" smooth scroll, trust line).
2. What's Included (icon grid + Not Included strip + free pre-trip night).
3. Route (vertical timeline mobile, stops from JSON).
4. Who's Coming (testimonials JSON + two badges + optional video).
5. Booking flow: spots dropdown → departure cards with badge ramp & 60-day deposit label → traveler details (1 vs 2–5 forms) → collapsed discount field → Stripe Checkout redirect.
6. FAQ accordion (8 static Qs).
7. Footer (WhatsApp, Terms/Privacy/Contact).

Hide departures where `Bookable? = false`, `Spots Remaining < groupSize`, or date < today + 7 days. Spot-badge thresholds and copy exactly per brief table.

### Phase 5 — Confirmation page
`/booking-success?session_id=...` reads back from Airtable by Stripe session ID, shows booking ref / trip / date / amount / balance, restates free arrival night, WhatsApp, share link.

### Phase 6 — Emails (templates 1 & 2 only)
- Confirmation: fired from webhook.
- Balance reminder: daily cron edge function querying Airtable for `Departure - 75d == today AND Balance Paid? = false`.

### Phase 7 — Done checklist
Mobile QA on viewport sizes; verify 60-day rule, double-spot-check, webhook idempotency (replay same event → 1 booking), discount validation, no overselling.

## The 7 critical rules (enforced in code, not docs)

1. Price resolved server-side at session creation only.
2. `Original Price`, `Discount`, `Final Price`, `Payment Type`, `Amount Paid` all locked onto the Booking record at write time.
3. 60-day rule: `departureDate − today ≥ 60d` → `$99 × groupSize`, else full × groupSize.
4. Spots checked twice: page load (hide) AND session creation (block).
5. Discounts don't stack, apply to full price not deposit.
6. `Bookable?` checked at session creation, not at webhook.
7. Idempotency: Stripe session ID is unique key in Bookings; webhook upserts by it.

## Explicitly out of scope (per brief)

No Postgres. No CMS. No user accounts. No admin panel. No live chat. No blog. No private room upgrade UI. No stacking discounts. No mobile app. No "later migrate Airtable to a real DB."

## What I need from you to start

Reply with which of these to do first — recommended order:
- **(A)** Enable Lovable Cloud + connect Airtable + add Stripe/Resend secrets. *I cannot build the backend without these.*
- **(B)** While you do A, I'll ship the Airtable setup doc + seed CSVs + the static trip page shell (with mocked data) so you can click through on mobile.

If you say "go", I'll start with B in parallel and stop at the first edge function until A is done.