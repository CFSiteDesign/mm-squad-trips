# Trip builder: logging in, later stages, and links that can't be pointed elsewhere

## Log in by email (`trip-builder-login`)

A guest who has sent a trip can "log in" from any device: the builder asks for the email they used and POSTs `{ email }` here. We email them a link to each trip they have sent (newest first, up to five), each with its own signed guest key (the same key as in the "your trip is checked" emails, valid 90 days). Opening the link gives them their trip page, where they can change the trip or plan the next stage. There is no password and no account.

- The answer is always `{ ok: true }`, whether or not the address has a trip, and a throttled address gets the same answer. It can't be used to find out who has booked.
- Only trips that are still live (submitted, checking, ready, approved) are included: not declined, and not one waiting on an unpaid deposit (the deposit is off by default now, so a free trip is live as soon as it is sent, see [trip-builder-free-send.md](trip-builder-free-send.md)). What is printed about a trip is only plain text.
- Three emails an hour per address, counted from `email_send_log` (template `trip_builder_login`). No new table, no migration.
- A hidden `website` field that is filled in is treated as a bot (same answer, nothing sent).
- An address is matched as plain text only: `_`, `%`, `\` and `*` in it can't act as wildcards, so `a_b@x.com` never matches `aXb@x.com`'s trips.
- Links are built on one of our own sites whatever the `Origin` header says (see below).

## Later stages

The builder's "Plan my next stage" sends a new request (its own review, and its own deposit only if the deposit switch is on) marked as stage 2, 3...: `payload.stage = { n, parent, from, been }` and `payload.summary.stage` (where they start, the first journey, where they have already been, the earlier trip's reference). `readSummary` reads it defensively (`readStage`): the number is clamped, the parent has to look like a trip reference, everything else is length-limited text. The crew's new-trip email gets a "Stage 2 of their journey" box and a `Stage 2 ·` subject, and the review page shows the same box. No migration: it all lives in `payload`.

## Links in our emails only point at our own sites

A browser's `Origin` header is just text, so anyone could send a request that says `Origin: https://evil.example` and, before this change, get the crew's Approve / Not approved / Edit it buttons (which carry a key) and the guest's links built on that address. Now:

- `trustedBase()` (`_shared/app-base.ts`) only ever returns madmonkeyhostels.com and its subdomains (https), `mm-squad-trips.lovable.app`, local development, and anything in the optional secret `TRIP_BUILDER_ALLOWED_ORIGINS` (hostnames, comma separated, `*.example.com` for subdomains). Everything else becomes the live site. `appBase()` is unchanged, so the older ALL IN checkout keeps working as before; you may want the same allow-list there.
- A trip's `link` is only stored if it leads to a trip in our own builder; the crew's edited version has to as well. Email templates drop any link that isn't plain http(s) (`safeHref`), so rows saved before this change can't print a `javascript:` link.
- `trip-builder-request`: at most 5 trips an hour per contact and 10 per address (the address is kept only as a keyed hash in `payload.ipHash`), a refusal saves nothing.
- The admin password is compared in constant time.

**One thing to do:** set the secret `TRIP_BUILDER_LINK_SECRET` to a long random value (`openssl rand -hex 32`). Without it the links are signed with `ADMIN_PASSWORD`, and anyone holding one link (every guest does) could guess admin passwords offline against its signature. The functions log a warning while it is unset.

## Tests

`deno test supabase/functions/_shared/` (48: `app-base`, `links`, `trip-builder-stage`, and the earlier ones), and the end-to-end run in the builder repo, `handoff/all-in-backend/e2e/run.sh <this repo>` (114 checks, including forged origins, bad links, the rate limits, logging in, and a later stage reaching the crew).
