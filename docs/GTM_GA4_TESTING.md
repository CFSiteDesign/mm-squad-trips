# GTM / GA4 Tracking — Testing Instructions

Companion to [`GTM_GA4_IMPLEMENTATION.md`](./GTM_GA4_IMPLEMENTATION.md) — read that first (it's short now: this covers one bug fix on top of the tracking already pushed to `origin/feature/gtm-ga4-tracking`, not a from-scratch build). This doc is the *how to verify it works*, meant to be run by whoever picks up `fix/gtm-cookiebot-duplicate-script` before merging.

## Setup

```bash
cd mm-squad-trips
bun install       # or npm install
bun run dev        # starts on :8080 by default (vite.config.ts), or pass --port
```
Open the printed local URL in a browser with DevTools open (Console tab).

## Manual check 1 — GTM loads at all, and Cookiebot loads exactly once

In the DevTools **Network** tab, reload the page and confirm a request to `googletagmanager.com/gtm.js?id=GTM-KC78NFHD` fires (not a 404, not blocked). In **Console**, run:
```js
window.dataLayer
```
You should see `gtm.js`, `gtm.dom`, `gtm.load` events already present.

**This is the specific regression check for this fix:** confirm the Console does **not** show `WARNING: Cookiebot script is included twice - please remove one instance to avoid unexpected results.` If you see that warning, the fix didn't apply correctly — check `index.html` for a second, hardcoded `<script id="CookiebotSetupScript">` tag (the shared GTM container already loads Cookiebot itself; there should be no manual one in this file).

## Manual check 2 — Cookiebot consent banner

Reload in an **incognito/private window** (so there's no stored consent decision). Confirm the Cookiebot banner actually renders and visually sits on top of the page (it will intercept clicks on anything underneath until dismissed — expected). Accept it, then in Console:
```js
window.dataLayer.filter(e => e.event && e.event.includes('consent'))
```
Confirm consent-related events appear after accepting.

## Manual check 3 — `view_item`

Navigate to `/vietnam` (or `/cambodia`, `/indonesia`, `/vietnam-7`, `/indonesia-7`). Wait ~1–2s for the real trip data to load (you'll see the page repaint once Supabase responds). In Console:
```js
window.dataLayer.filter(e => e.event === 'view_item')
```
Confirm exactly **one** entry, with `conversion_type: "all_in"`, `ecommerce.value` matching the real displayed price (not a suspiciously round placeholder number), and `ecommerce.items[0].item_category === "All In"`.

## Manual check 4 — `page_view` on route change

From that trip page, click through to a different trip (e.g. via the nav or a cross-sell link) without a full page reload. Check `window.dataLayer` again — a new `page_view` entry should appear with `page_location`, `page_path`, and `page_title` all set and matching the new page.

## Manual check 5 — `begin_checkout`

Scroll to the booking section. Pick a group size, pick a departure card, fill in the lead form (name, email, phone, **and Country** — Country is a dropdown/popover, not a text field, easy to miss). Click **"CONTINUE TO PAYMENT →"**. Before the browser redirects to Stripe, check Console:
```js
window.dataLayer.filter(e => e.event === 'begin_checkout')
```
Confirm one entry with the correct `value`, `conversion_type: "all_in"`, and item details. If you want to test the dedupe behavior without actually reaching Stripe, block the request first: DevTools → Network → right-click → **Block request URL** on `create-checkout-session`, then click submit twice — should still only produce **one** `begin_checkout` entry.

## Manual check 6 — `purchase`

Two ways to test this without a real card:
- **Real Stripe test-mode flow** (if a test secret key is configured on the Supabase project): complete checkout with a [Stripe test card](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`), get redirected to `/booking-success`, check `window.dataLayer` for a `purchase` event with the correct `transaction_id` (matches the `session_id` in the URL) and `conversion_type: "all_in"`.
- **Without Stripe**: if you have any real `session_id` from a previous booking, navigate directly to `/booking-success?session_id=<that id>` — the page will call the real `booking-lookup` function and the `purchase` event should fire once real booking data loads. Reload the page and confirm it does **not** fire a second time (dedupe).

## Manual check 7 — `sign_up`

Go to `/squad-leader/register`, fill the form, submit. Check `window.dataLayer` for a `sign_up` event with `method: "squad_leader"`. Repeat at `/students/squad-leader/register` and expect `method: "squad_leader_student"`.

## GTM Preview mode (recommended before merging, not just local console checks)

1. In the [GTM web UI](https://tagmanager.google.com/), open the `GTM-KC78NFHD` container → **Preview**.
2. Enter the local dev URL (or a deployed preview URL if Lovable's pipeline gives you one).
3. This opens Tag Assistant connected to that page — repeat checks 3–7 above while watching the Tag Assistant panel instead of the raw console. Confirm the relevant GA4 tags (`ga4 - event - ecommerce events`, `ga4 - event - page_view`, `ga4 - event - sign_up`) show as **Fired**, not just that the dataLayer event exists — this confirms the shared container's *existing* triggers actually pick up our events, not just that we pushed something with the right shape.

## What was already verified (with the fix applied, before this branch was handed off)

This was tested end-to-end with a real headless browser (Playwright) against the running dev server on `fix/gtm-cookiebot-duplicate-script`, with all backend calls mocked so nothing touched live Stripe/Supabase. Confirmed actual `window.dataLayer` and console output, not just that code compiled:

| Check | Result |
|---|---|
| GTM core load | `gtm.js`/`gtm.dom`/`gtm.load` all present, **zero** Cookiebot duplicate-script console warnings |
| `view_item` | Fires once per trip with real Supabase pricing (Vietnam $850), correct `conversion_type: "all_in"`, `item_category: "All In"` |
| `begin_checkout` | Correct value/`conversion_type`; double-submit (retry after a blocked request) fires it once, not twice |
| `purchase` | Correct deposit value (`$99`), correct `transaction_id`, correct `conversion_type`; page reload fires it zero additional times |
| `page_view` | Correct `page_location`/`page_path`/`page_title` on SPA route change |
| `sign_up` | Fires correctly with `method: "squad_leader"` |

Also confirmed via `curl` against the dev server: Vite's `%VITE_GTM_ID%` HTML replacement correctly resolves to the literal `GTM-KC78NFHD` in the served page (not the raw placeholder text), and `tsc --noEmit` is clean with these changes.

`sign_up` (`squad_leader_student` variant) was not separately Playwright-tested — it's the identical one-line pattern as the regular squad leader signup, already typechecked.
