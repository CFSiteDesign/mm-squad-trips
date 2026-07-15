# GTM / GA4 Tracking — Bug Fix Handoff

**This is a bug-fix doc, not an implementation-from-scratch doc.** The GTM/GA4 tracking for `mm-squad-trips` already exists — it was built and pushed to `origin/feature/gtm-ga4-tracking` on GitHub (commits `94eeda6` "Add GTM/GA4 ecommerce tracking to the booking and squad-leader funnels" and `9de3ef8` "Report balance charge to GA4 via Measurement Protocol"). This doc covers **one bug found in that branch, and its fix** — nothing more.

**Status:** Fix implemented and verified locally on branch `fix/gtm-cookiebot-duplicate-script`, one commit (`5ea883c`) on top of `origin/feature/gtm-ga4-tracking` at `9de3ef8`. **Not pushed** — apply the attached patch (`0001-Fix-duplicate-Cookiebot-script-causing-consent-track.patch`) on top of that branch.

## The report

GTM was reported as "not running" on `origin/feature/gtm-ga4-tracking`.

## What was actually true

GTM itself was **not** broken. Running the real dev server on that exact branch and driving it with a headless browser confirmed: `gtm.js`, `gtm.dom`, `gtm.load` all fire, `window.google_tag_manager` is populated, and real network requests go out from the shared `GTM-KC78NFHD` container to GA4, Google Ads, and TikTok endpoints. The container is loading and working.

## The actual bug

Browser console showed:
```
WARNING: Cookiebot script is included twice - please remove one instance to avoid unexpected results.
```

**Root cause:** the shared `GTM-KC78NFHD` container (the same one the main Mad Monkey frontend uses) already has its **own** Cookiebot tag — a community template tag (tag id `74`, named "Cookiebot"), configured to fire on GTM's special **Consent Initialization** trigger. This was confirmed by inspecting the container's actual export at `frontend/docs/analytics/gtm/GTM-KC78NFHD_workspace48.json` in the umbrella repo.

`mm-squad-trips/index.html` **also** hardcoded a separate, manual `<script id="CookiebotSetupScript" src="https://consent.cookiebot.com/uc.js" ...>` tag. So on every page load, Cookiebot was being loaded twice — once by GTM's own tag, once by the hardcoded script. Cookiebot detects this itself and logs the warning, and "unexpected results" (per Cookiebot's own wording) is a reasonable explanation for tracking appearing broken or unreliable — duplicate consent-management scripts can race, double-register consent listeners, or leave the page in an inconsistent consent state.

## The fix

Removed the redundant hardcoded `<script id="CookiebotSetupScript">` block from `index.html`. Kept the Google Consent Mode default stub (`gtag('consent', 'default', {...})`) — that still needs to run in the page **before** `gtm.js` loads, regardless of who loads Cookiebot itself; it's what sets consent to `denied` by default until Cookiebot (now loaded once, via GTM) grants it.

```diff
-    <!-- Cookiebot Cookie Consent (same domain group as madmonkeyhostels.com — this app is served at /all-in-trips on that domain) -->
-    <script
-      id="CookiebotSetupScript"
-      src="https://consent.cookiebot.com/uc.js"
-      data-cbid="ca1958c7-4d45-419e-821f-0b5dc0190413"
-      data-blockingmode="auto"
-      type="text/javascript"
-      async
-    ></script>
+    <!-- Cookiebot itself is NOT hardcoded here — the shared GTM-KC78NFHD
+         container already has its own "Cookiebot" tag (a community template,
+         firing on GTM's Consent Initialization trigger). Adding a second,
+         hardcoded <script id="CookiebotSetupScript"> here loaded it twice
+         (confirmed via console: "Cookiebot script is included twice"),
+         which is what was actually breaking things — not GTM itself. -->

     <!-- Cookiebot to Google Consent Mode Integration -->
     <script>
```

Full patch: `0001-Fix-duplicate-Cookiebot-script-causing-consent-track.patch`.

## Verified after the fix

Ran the full event suite against the real dev server with this fix applied (headless browser, all backend calls mocked so nothing touched live Stripe/Supabase):

| Check | Result |
|---|---|
| GTM core load | `gtm.js`/`gtm.dom`/`gtm.load` all present, **zero** Cookiebot console warnings |
| `view_item` | Fires once, real Supabase pricing (Vietnam $850), `conversion_type: "all_in"`, `item_category: "All In"` |
| `begin_checkout` | Correct value/`conversion_type`; double-submit (retry after a blocked request) still fires exactly once |
| `purchase` | Correct deposit value (`$99`), correct `transaction_id`, correct `conversion_type`; reload fires **zero** additional times |
| `sign_up` | Fires with correct `method: "squad_leader"` |
| `page_view` | Fires on SPA route change with correct `page_location`/`page_path`/`page_title` |

`tsc --noEmit` clean.

## Not touched, on purpose

- **TikTok Pixel "Invalid Event Name Format" console warnings.** Traced to the shared container's own TikTok tag configuration — not this app's code. This matches an already-known, unresolved finding (`L3`) in the main site's own GTM audit report. Fixing it means editing the shared container in the GTM web UI (out of scope here, and affects the main site too).
- **`net::ERR_ABORTED` on `doubleclick.net`/`google-analytics.com` collect requests** seen during local testing — looks like this specific sandboxed dev environment blocking ad-tracking domains at the network level, not a code issue. Worth a real-browser sanity check on a normal network before assuming it's fine, but not something to chase here.
- **No UI changes.** This fix is a single `<script>` tag removal in `index.html`.

## How to apply

```bash
cd mm-squad-trips
git fetch origin
git checkout -b fix/gtm-cookiebot-duplicate-script origin/feature/gtm-ga4-tracking
git am docs/0001-Fix-duplicate-Cookiebot-script-causing-consent-track.patch
```

Then see [`GTM_GA4_TESTING.md`](./GTM_GA4_TESTING.md) to re-verify locally before merging.
