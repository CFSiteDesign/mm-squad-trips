# Student All In Trips — Plan

A "student" variant of the site that reuses the existing trips, booking, and squad leader system, but with different copy, different squad rewards (2 free spots @ 10 bookings), extra signup fields, and Hayley-approved applications before a code goes live.

---

## 1. New `/students` homepage

New route `/students` rendering a `StudentIndex` page (clone of `Index.tsx` with copy swapped):

- H1: **ALL IN STUDENT TRIPS BY MAD MONKEY**
- Sub: *That trip you've been talking about all year? Let's make it happen. You bring the crew, we'll handle the planning, logistics and bookings.*
- Ticker: `2 FREE SPOTS FOR SQUAD LEADERS · $99 HOLDS YOUR SPOT · …`
- Trip cards link to `/students/vietnam`, `/students/indonesia`, `/students/cambodia` (same `TripPage`, just a `variant="student"` flag — see §3).
- Footer block (above SiteFooter or replacing SquadCTA):
  - **WANT 2 FREE SPOTS? BRING YOUR SQUAD**
  - *Apply to be a Mad Monkey Student Squad Leader. You bring the crew. We'll handle the rest.*
  - Button → `/students/squad-leader`

## 2. Student squad leader pages

New routes mirroring the existing squad-leader flow, all rendering student-variant components:

- `/students/squad-leader` — student hub
  - Hero: **WANT 2 FREE SPOTS? BRING YOUR SQUAD** + same blurb as footer.
  - How it works (renumber to match user's list):
    1. Apply / register
    2. Pick your trip — choose any departure date
    3. Send your code to the rest of your squad
    4. Hit 10 bookings and get 2 extra spots on us
  - FAQs: remove *"What if I get fewer than 4 bookings?"*, add **"What if less than 10 people book?"** (answer: no free spots, but you still travel at standard price with your crew).
- `/students/squad-leader/register` — student application form
  - Add **University** (required) and **Society** (optional).
  - Remove **"Why do you want to lead a squad?"** (`reason`).
  - Rewards copy: remove 4 @ 50% off; show **"2 free squad leader spots when 10 people book"**.
  - On submit: creates a `squad_leaders` row with `is_student = true`, `status = 'pending'`. No code is issued or emailed yet.
  - Success screen: *"Application received — Hayley will review and email you once approved."*
- `/students/squad-leader/login`, `/forgot-password`, `/reset-password`, `/dashboard` — same components, just routed under `/students` so links stay in the student section. Login is blocked until `status = 'approved'` (error: "Your application is still being reviewed").

## 3. Trip pages — copy changes (apply to all `TripPage` variants, not just student)

Per user, these go on the existing country pages too:

- "Solo traveller, not for long" → **"Your group trip, sorted"** (in `Hero.tsx`).
- Remove **WHO'S COMING?** section (drop `<WhosComing />` from `TripPage.tsx`).
- Rename "Your new crew" → **"What travellers are saying"** (in `Testimonials.tsx`).

`TripPage` accepts an optional `variant: "student"` prop; when student:
- Trip cross-sell + footer CTAs route to `/students/...` equivalents.
- "Become a Squad Leader" CTA → `/students/squad-leader`.

## 4. Backend changes

Single migration adds to `squad_leaders`:

- `is_student boolean not null default false`
- `status text not null default 'approved'` — values: `pending | approved | rejected` (validation trigger, not CHECK).
- `university text`, `society text`
- `reason` stays nullable (already is).

Edge functions:

- `squad-register` — accept `is_student`, `university`, `society`; when `is_student` is true, set `status = 'pending'`, skip welcome email, return a "pending review" response.
- `squad-login` — reject login if `status <> 'approved'`.
- `squad-admin` (admin list/detail) — surface `is_student`, `status`, `university`, `society`.
- New `squad-approve` action inside `squad-admin` (token-gated like other admin endpoints): sets `status` to `approved` or `rejected`, issues the squad code on approval, and sends the welcome / set-password email.

Admin UI (`/admin` → Squad Leaders tab):

- Filter chip: **Student applications (pending)**.
- New columns: University, Society, Student?, Status.
- Approve / Reject buttons on pending student rows.

## 5. Rewards math

Existing system gives 50% off at 4 and free at 8. Student leaders use a different ladder:

- Single milestone: **10 bookings → 2 free spots**.
- `SquadDashboard` (when leader `is_student`) shows a single progress bar to 10 with "2 FREE SPOTS" unlocked at 10, replacing the 50%/free ladder.
- Redemption: free-spot booking is created via the existing **+ ADD COMP** admin flow (Hayley uses it after the leader requests their 2 spots). No automatic checkout discount needed for v1.

## 6. Out of scope (v1)

- Automated student-ID verification — Hayley approves manually.
- Self-service redemption of the 2 free spots — handled via admin comp booking.
- Student-only pricing on trip pages — pricing stays identical.

## Technical notes

- New files:
  - `src/pages/StudentIndex.tsx`, `src/pages/StudentSquadHub.tsx`, `src/pages/StudentSquadRegister.tsx`
  - Optional: small `useSiteVariant()` hook reading `useLocation()` for `/students` prefix so shared components (footer, navbar, cross-sell) link to the right routes.
- Reused as-is (with `variant` prop): `TripPage`, `SquadLogin`, `SquadDashboard`, `SquadForgotPassword`, `SquadResetPassword`.
- Routes added in `App.tsx`:
  ```
  /students
  /students/:country  (vietnam|indonesia|cambodia → TripPage variant="student")
  /students/squad-leader, /register, /login, /forgot-password, /reset-password, /dashboard
  ```
- DB migration includes `GRANT`s for new columns are automatic (column-level grants follow table grants).
- Edge functions touched: `squad-register`, `squad-login`, `squad-admin`. Validate all new fields with zod.

---

Want me to build this as specified, or tweak anything (e.g., should student trips have different prices/itineraries, or should approved students get an auto-emailed welcome with their code)?
