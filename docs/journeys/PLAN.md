# ALL IN guest journeys: admin wireframe plan

Charlie, 13 Oct 2026, from the ALL IN dashboard meeting: map the full
post-booking journey for each traveller type (Independent and With a crew)
inside the admin, so Lexie can review every message in context, and close
the gaps the meeting found. Built and reviewed on a demo first.

## Demo (no login)

https://mm-allin-admin-demo.vercel.app (Vercel project `mm-allin-admin-demo`,
scope cfsitedesigns-projects). It is the admin's built-in preview mode:
demo data only, read-only (every write is refused), every other address on
the domain redirects to it, noindex. Deleted once this goes live.

Deploy recipe: `npx vite build --outDir <dir>`, drop the public extras
(videos, trip pages), add the demo `vercel.json` (redirect everything except
/adminpreview and assets, rewrite /adminpreview to index.html, noindex), then
`vercel deploy --prod --yes --scope cfsitedesigns-projects` from that dir.

## The two routes, as the system behaves today

Route 1, Independent:
1. Books and pays ($99 deposit if 7+ days out, otherwise in full).
   Guest: "Booking confirmed" email. Ops: booking alert. Klaviyo: Booking
   Placed, plus WhatsApp trip-updates consent if they ticked the box.
2. 7 days before: balance charged automatically. Guest: "Balance paid", or
   "Balance failed" with retries every 2 days.
3. 6 to 4 days before: "Final details" email (paid version, or the pay-link
   version if the charge failed).
4. Property team: manifest 7 days and 1 day before (reception@, trip GMs,
   Vietnam travel desks).
5. Klaviyo: Mich's day-by-day flows off `allin_departure_date`.

Route 2, With a crew: everything in Route 1, plus
- 10 days before: fewer than 5 travellers on the departure means a heads-up
  email (still going ahead, you'll meet people, contact cs@ for a deposit
  refund). 5 or more: skipped.

## Gaps against the meeting notes

1. **Solo wording.** Notes: Route 1 gets slightly different wording. Today
   both get one confirmation (unified 8 Oct). Split it into an Independent
   and a Crew version again; Lexie edits the words.
2. **"Or immediately if under 10 days".** Today the heads-up only fires 10 to
   8 days out, so a crew booking made 5 days out never gets it. Fire it right
   after the booking when the departure is already inside 10 days, and let the
   daily job cover 10 to 1 days.
3. **Cancel button.** Add "Cancel my booking" to the heads-up.
   - A (ideal): signed link for that one booking, a confirm page, then the
     system cancels, refunds through Stripe, stops the balance charge, emails
     the guest, and notifies the trip GMs, Reden, ops and cs@.
   - B (fallback): the button opens an email to cs@ with the booking ref
     filled in; CS cancels in admin.
   Recommendation: A, with B offered on the page if anything fails.
4. 7-day charge: unchanged for everyone.

## The wireframe tab ("Guest journeys")

- Two lanes side by side, Independent and With a crew. Each step is a card:
  when it fires, the condition, the channel (email, WhatsApp, ops), and who
  receives it.
- Click a card to see the real email with sample data, subject on top. The
  templates in `supabase/functions/_shared/email.ts` have no backend imports,
  so they are rendered at build time to static HTML (same Vite SSR trick as
  the SEO prerender) and can't drift from what guests get.
- The crew lane shows the 10-day branch (under 5: heads-up; 5+: skip) and
  the cancel path.
- Klaviyo and WhatsApp steps appear as Mich-owned steps, without previews.

## Phases

0. Demo live (done 13 Oct 2026).
1. Wireframe tab on branch `demo/journeys`, deployed to the demo for Lexie.
   Nothing live changes.
2. Gaps 1 to 3 on the same branch; the demo shows the new emails.
3. Lexie's wording edits.
4. Go live: merge, Publish, deploy functions (and a migration if the cancel
   flow needs one), delete the demo project.

## Decisions needed from Charlie

1. Cancel: automatic (A) or CS handles it (B)?
2. Refund on cancel: deposit only (what the FAQ says), or everything paid
   (inside 7 days the balance has been charged too)?
3. Who is told about a cancellation: trip GMs, Reden, ops, cs@? Reden's
   address?
4. Inside 10 days: heads-up straight after the booking confirmation, or the
   next morning?
