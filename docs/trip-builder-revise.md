# Trip builder: guests change a trip after sending it

A guest can change the trip they already sent, until it is booked. The change **replaces** the trip on the same request (same reference, same deposit, same beds held), so the crew only ever reviews the latest plan and never one the guest has already moved on from. No migration, no new secret, nothing extra to pay for: it uses the `payload` the request already stores.

## How it works

1. The guest opens their trip page (`#/trip/<ref>?k=<key>`) and presses **Change my trip**. The builder opens the version the crew has, with a bar saying so. They edit it, press **Send my changes**, add an optional note.
2. The builder posts the new trip to `trip-builder-revise` (`{ ref, k, trip, summary, crewText, itinerary, note, changes }`: the same shape as the original send).
3. The function checks the guest key and that the trip's link is into our own site, then replaces the trip and bumps `payload.rev` (the last 10 versions are kept in `payload.history`: what it was, when, the guest's note, what changed).
4. The crew gets an **UPDATED (v2)** email: what moved, what it was before, the guest's note and the usual Approve / Not approved / Edit it buttons. The guest gets "we've got your changes".

| Status | What a change does |
|---|---|
| `pending_payment` (deposit not paid) | replaced quietly; nobody is emailed (the crew hasn't seen it). Their first email will already be the new version |
| `submitted`, `checking` | replaced; crew emailed |
| `ready` (approved, price set) | the approval and price are **withdrawn** (`balance_*`, `pay_plan`, `pay_schedule` cleared), back to `checking`; crew emailed and told so; the guest is told nothing is due |
| `approved` (booked) | refused with 409: money is moving, so a payment is never left pointing at a plan that moved. The guest is told to message the crew |
| `declined` | refused with 409 |

Sending the same trip again changes nothing and emails nobody. A trip can be changed 30 times; after that it asks them to message the crew. A crew edit ("Edit it") is replaced by the guest's next version.

## What changed in the existing functions

- `trip-builder-request` returns the guest's `key` and sends Stripe's success/cancel URL to their own trip page with it.
- `stripe-webhook` (`_shared/trip-builder.ts`): the deposit email's "Track my trip" link carries the key. The crew email is now built by `notifyCrew()`, which the revise function reuses.
- `trip-builder-status` also returns `canEdit` (keyed and editable), `rev`, `people` and `datesFlex`.
- `trip-builder-admin`: `view` returns `rev` and `guestRevision`; **approve, decline, booked, checking and revise refuse (409 "stale") if the page was showing an older version**, so nobody approves a plan they haven't seen. The review page shows a pink banner with what the guest changed.
- `_shared/email.ts`: `tripBuilderOpsEmail` takes an optional `update` (the banner and the UPDATED subject); new `tripBuilderRevisedEmail` for the guest.

## Deploy

Deploy `trip-builder-revise` and redeploy `trip-builder-request`, `trip-builder-status`, `trip-builder-admin` and `stripe-webhook`. `supabase/config.toml` lists the new function (`verify_jwt = false`, like the others). The live builder's `config.js` gets `REVISE_ENDPOINT` from the sync script.

## Checks

`deno test supabase/functions/_shared/trip-builder-revise.test.ts` (10) and `handoff/all-in-backend/e2e/run.sh <this repo>` in the trip builder repo (79 checks, 26 of them for this).

**Security notes.** The guest key is the same one that lets a guest choose how to pay; it is bound to one trip, lasts 90 days and travels in the `#` part of the link. Whoever has the link can change that trip (until it is booked), exactly as they could already pay it, so treat it like the payment link. Trip links in a change must be into our own site.
