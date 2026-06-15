The user wants the "Open your dashboard" link in the squad-created email to point to `madmonkeyhostels.com/all-in-trips/squad-leader/dashboard` instead of the Lovable app URL.

The `dashboardUrl` is constructed in `supabase/functions/squad-register/index.ts` (lines 56 and 85) using the shared `APP_URL` constant. Changing `APP_URL` globally would also break booking-success links, password-reset links, and the email logo, so we should only change the squad-register function.

Plan:
1. In `supabase/functions/squad-register/index.ts`, replace both instances of `${APP_URL}/squad-leader/dashboard` with `https://madmonkeyhostels.com/all-in-trips/squad-leader/dashboard`.
2. Deploy the affected edge function.