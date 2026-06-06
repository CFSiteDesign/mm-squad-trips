# Squad Leader Integration Plan

Bring the squad code creator from the `Mad Monkey Squad` project into this site. All squad data lives in Lovable Cloud (no Airtable). Existing booking → Stripe → Airtable flow is untouched, except `stripe-webhook` will increment a squad counter when a booking used a squad code.

## Reward tiers (updated)
- **4 bookings → 50% off your trip**
- **8 bookings → 100% FREE trip**

(No middle tier. Progress bar shows two milestones at the 50% and 100% marks.)

## What gets added

### 1. New pages (ported from source project, restyled to mm-* design tokens)
- `/squad-leader` — marketing hub: hero, how-it-works (4 steps), tier cards (50% / FREE), FAQ, CTA. The existing `SquadCTA` block links here.
- `/squad-leader/register` — apply form (name, email, phone, IG handle, preferred trip, departure month, why). On submit, calls backend, generates a unique code, redirects to dashboard with a magic-link token.
- `/squad-leader/dashboard?token=...` — squad code, 8-slot progress grid, milestone bar with two markers (4 → 50% OFF, 8 → FREE TRIP), recent bookings table, share modal (WhatsApp / Instagram / native share).

Dashboard copy logic:
- 0–3 bookings: `"X more bookings to unlock 50% off"`
- 4–7 bookings: `"50% off locked in — Y more and your trip is FREE"`
- 8+ bookings: `"Trip unlocked. You're going for FREE 🔥"`

### 2. Backend (Lovable Cloud)
Tables:
- `squad_leaders` — id, name, email (unique), phone, instagram, preferred_trip_slug, preferred_month, reason, code (unique, e.g. `SQUAD-ABC123`), access_token (uuid), created_at.
- `squad_bookings` — id, squad_leader_id (fk), booker_name, booker_email, trip_slug, departure_date, stripe_session_id (unique), created_at.

RLS locked down; all reads/writes via edge functions using `service_role`. Dashboard auth = `access_token` in URL (no Supabase Auth — keeps it frictionless).

New edge functions:
- `squad-register` — validates input, generates code, inserts row, returns `{ code, accessToken }`.
- `squad-dashboard` — input `{ accessToken }`, returns leader + bookings + computed tier.

### 3. Hook into existing checkout
- `validate-discount`: if Airtable lookup misses, fall back to `squad_leaders.code`. Matched squad code returns `{ valid: true, discountAmount: 0 }` — squad codes credit the leader, they don't discount the booker.
- `stripe-webhook`: after the booking row is created, if `discountCode` matches a `squad_leaders.code`, insert a `squad_bookings` row. Wrapped in try/catch — never fails the webhook (mirrors the existing Group Members pattern).

### 4. Frontend wiring
- `src/lib/squad.ts` — `registerSquadLeader`, `getSquadDashboard` via `supabase.functions.invoke`.
- 3 new routes added to `src/App.tsx`.
- `SquadCTA` button → `<Link to="/squad-leader">Apply now</Link>`.
- Visuals restyled to mm-pink / mm-lime / mm-bone / font-display / sticker borders to match this site.

## Technical details
- Code format: `SQUAD-` + 6 random base32 chars; retry on unique-violation.
- `access_token`: `gen_random_uuid()`, only surfaced in the post-registration redirect URL. Treat as a bearer secret.
- Tier math in one shared helper used by the dashboard and any future email.
- Out of scope for v1: emailing the code to the leader, admin view, code expiry, resource downloads (cards render as static placeholders).

## Files

New:
- `supabase/migrations/<ts>_squad_leader.sql`
- `supabase/functions/squad-register/index.ts`
- `supabase/functions/squad-dashboard/index.ts`
- `src/pages/SquadHub.tsx`
- `src/pages/SquadRegister.tsx`
- `src/pages/SquadDashboard.tsx`
- `src/lib/squad.ts`

Edited:
- `supabase/functions/validate-discount/index.ts` — squad-code fallback
- `supabase/functions/stripe-webhook/index.ts` — record squad booking (best-effort)
- `src/App.tsx` — 3 new routes
- `src/components/trip/SquadCTA.tsx` — link to /squad-leader
