# ALL IN Trips — August 2026 brief

Source: `ALL IN Trips Edits - Aug 2026.pdf` (11 Aug 2026)
Live page: https://madmonkeyhostels.com/all-in-trips/

**Approach: build this as a separate preview, not as edits to the live pages.**
Nothing customer-facing changes until the client has seen and approved the demo.

---

## How the preview works

Two new routes that live alongside the current site and do not touch it:

| Route | Shows |
|---|---|
| `/preview-all-in` | The rebuilt landing page |
| `/preview-indonesia` | The rebuilt Indonesia trip page |

Three deliberate choices:

**Single-segment URLs, not `/preview/indonesia`.** Any route with two or more
path segments white-screens on the `mm-squad-trips.lovable.app` domain because
the asset paths are relative there. That is exactly the link the client would be
sent, so a two-segment preview URL would be dead on arrival. A single segment
sidesteps it entirely without touching the Vite base config or risking the
Cloudflare rewrite on the live site.

**Real components, real data, real booking flow.** The preview reads the same
database and reuses the same booking machinery, so it is the actual build rather
than a mockup. That matters twice over: the client is approving the real thing,
and shipping it afterwards is a routing swap rather than a rebuild.

**`noindex` on both.** Unlisted and uncrawled, so it cannot compete with the
live page in search or get shared beyond the people meant to see it.

When the client signs off, promotion is a small, reversible change: point the
existing routes at the new pages and retire the preview ones. If they want only
half of it, we ship half.

---

## Phase 0. Unblockers

### Assets

| # | Asset | File | Status |
|---|---|---|---|
| Landing hero | Group on the boat | `Copy of 0607(2).jpg` | On disk, 2160x2698, 5MB |
| Trip hero | Indonesia trip page | `Siargao3IslandTourOutput (52 of 168).jpg` | On disk, 8192x5464, 17MB |
| Highlight 1 | Mt Batur Sunrise Trekking | `pexels-alexazabache-3290073.jpg` | On disk, 3731x5428 |
| Highlight 2 | Island Hopping, Nusa Penida | `pexels-joe-fikar-799933673-19160408.jpg` | On disk, 6000x8000, 8MB |
| Highlight 3 | Monkey See Monkey Do snorkelling | `GT Madventures Snorkeling Tour 3.jpg` | On disk, 1179x1179 |
| Highlight 4 | Kuta Lombok Surf Camp | `Copy of 0620.jpg` | On disk, 2896x2137 |
| Highlight 5 | Mexican Family Dinner | — | **Missing.** TBC in the brief |
| Highlight 6 | Bucket List Bike Tour | — | **Missing.** Sent in chat, not saved to disk |
| Videos | 2 x TikTok/Reels testimonials | — | **Missing.** Lexie, marked ASAP |
| Map | Story of your Trip | — | **Missing.** TBC in the brief |
| Reviews | 4 property reviews | `content/indonesia-reviews.md` | Copy in hand. 2 of 4 missing author/rating/date |

Every file on disk is far larger than it needs to be. The Nusa Penida shot alone
is 8MB and the trip hero 17MB, against a current full-page weight of about 240KB
of JavaScript. They all need resizing and converting to WebP before they go
anywhere near the page, or the preview will load slower than the live site and
the client will notice that before they notice the design.

Highlights 1 and 2 are Pexels stock. Everything around them is real Mad Monkey
photography, so the two stock frames will read as stock. Worth checking whether
anything usable exists in the library first.

### Decisions needed

1. **12 days or 13?** The brief says "Days: 12" and "12 days, 4 destinations",
   then the day-by-day runs Day 1 through Day 13. `trips.days` drives pricing,
   the balance schedule and the analytics item, so this is not cosmetic.

2. **The route has changed.** Live today: Bali > Gili T > Lombok > Uluwatu. The
   brief: Uluwatu > Nusa Lembongan > Gili T > Kuta Lombok. Different product,
   different cost. Confirm ops have signed it off, not just marketing.

3. **Meal counts disagree.** The FAQ says 4 breakfasts, 5 lunches, 5 dinners. The
   day-by-day adds up to considerably more. One of the two is wrong in front of
   customers.

4. **Currency.** Every G Adventures reference in the brief is AUD. We price and
   charge in USD. Confirm "From $700" is USD.

5. **Solo versus the 5-person minimum.** The Dates section promises solo
   travellers a "100% departure rate"; the FAQ says every departure needs 5 or it
   cancels. Both are true in our system, since solo is exempt, but as written on
   the page they contradict each other. The FAQ answer needs the carve-out.

6. **"Rated 4.9/5 by 53,000+ Mad Monkey Travelers."** Where does 4.9 come from,
   and does it hold up if challenged?

7. ~~**Google reviews.**~~ **Settled.** Client supplied all four by hand, so no
   Places API, no billed key, no attribution constraints. Captured in
   `content/indonesia-reviews.md`. Two still need a reviewer name, rating and
   date (Nusa Lembongan and Gili T), and the Kuta one needs confirming as Kuta
   Lombok rather than Kuta Bali.

The preview can be built without 1 to 4 settled, using current values as
placeholders, but they must be resolved before anything goes live.

---

## Phase 1. `/preview-all-in`

### Hero
New image, faded to the left so the copy stays legible, black overlay reduced so
the photo's colour shows, and no stretching.
Title: `TRIPS THAT MAKE IT OUT THE GROUP CHAT`
Sub: "Stop herding cats. 7 to 14-day epic adventures across Asia with the
ultimate backpacker crew. Real Mad Monkey beds, zero planning, and $99 holds your
spot."
CTA: `SECURE YOUR SPOT FOR $99`, hot pink. Remove the "What's in it" block.

The overlay is the risk. Copy has to stay legible against a bright photo at every
width, so this gets checked on mobile, not just desktop.

### What makes us different
Three-column icon grid: No Mystery Dorms, Solo? Not For Long, Zero Planning
Stress. Intro line about the iconic community event above it.

### Where's Your Adventure
Drop the intro copy and the ALL/VIETNAM/INDO/CAMBODIA filters. Add live badges to
each route card fed from `departures`: `NEXT TRIP: SEP 26 (ONLY 8 SPOTS LEFT)`.
Replace the arrow with a `VIEW DATES & ITINERARY` button.

The badge is the only real build. `trips-get` already returns next departure and
remaining spots, so it is presentation rather than new plumbing.

### What Your $99 Deposit Unlocks
Retitled from "Included in Every Trip". Tabs removed, replaced with a flat
What's In / What's Not table, green ticks and red crosses.

### Don't Take Our Word For It
Retitled from "What Travellers are Saying". Two text cards become embedded
short-form videos, plus the trust badge. Blocked on Lexie.

Embedding TikTok pulls in a third-party script and a cookie-consent question.
Self-hosted MP4 avoids both and loads faster. Worth raising before we commit.

### Travel For Free When You Bring The Crew
Retitled from "Earn a Free Trip". Bring 4 for 50% off, bring 8 and go free.
"You rally the group chat, we handle the logistics."

### Mobile
Persistent sticky `RESERVE FOR $99` bar at the bottom of the viewport, jumping to
destination selection.

---

## Phase 2. `/preview-indonesia` global mechanics

Per the brief, these come before any section work.

**Sticky sub-navigation.** Sits below the hero, sticks on scroll. Horizontal tabs
on desktop, scrollable pills on mobile. Overview, Itinerary, What's Included,
Dates & Prices, FAQ. Needs scroll-spy and anchor offsets so sections do not land
underneath the bar.

**Desktop pricing card.** Floating, right side, about 25% width, stays put while
the left column scrolls. Regular price struck through, discount badge, from-price,
valid-on date, duration, `See all dates`. Desktop only. On mobile the sticky
bottom bar does this job.

---

## Phase 3. `/preview-indonesia` sections

| Section | Notes |
|---|---|
| Tour Overview | "Your adventure snapshot": trip code, days, from, to, countries. New |
| Is this Tour for me? | Vibe, Age Range, Group Size, Physical Level. New |
| CTAs | Hot pink `RESERVE FOR $99` anchored to dates, secondary `SEE ALL DATES`. New |
| Tour Highlights | 6 image cards with an `included` bubble. New |
| What's Included | Two columns, 3 rows visible, `See All` expands. Rework of `Included.tsx`, drop "The Extras" |
| Story of your Trip | Day-by-day, two columns, everything visible, no pop-out, map above. Rework of `IndonesiaItinerary.tsx` |
| Dates & Availability | "The Countdown Starts Now", month toggles, solo and squad stacked above. Rework of the picker in `BookingFlow.tsx` |
| Reviews | One Google review per property, four properties. Copy in hand, see `content/indonesia-reviews.md`. New |
| FAQ | ~20 Q&A, Indonesia-specific. Rework of `FAQ.tsx`, currently shared across all trips |

Two carry more risk than they look:

**Dates & Availability** is a re-skin of the live booking flow, which currently
carries the custom-date picker, squad-code reveal, solo handling, group size and
all the discount logic. Re-skinning must not disturb any of it. Building it in the
preview first is the safest possible way to do this, since the live flow keeps
running untouched while we work.

**FAQ** is one shared component across all five trips today. Making it per-trip
means moving the content into the database, which is the right move anyway.

---

## Phase 4. Content

Load the real Indonesia content: hero, revised 4-stop route, the day-by-day, 6
highlights, the snapshot block, 4 reviews and the full FAQ set. Depends on
decisions 1, 2, 3 and 7.

---

## Phase 5. Make it repeatable

The brief covers Indonesia only, but the same treatment is coming for the other
four trips.

**Option A.** Build for Indonesia, copy it four times later. Fastest to a first
result, four times the work afterwards, and every future copy change comes back
to me.

**Option B.** Build the template once and drive it from the database. Itinerary
days, highlights, the snapshot, reviews and FAQ become rows Mad Monkey edits in
the admin console they already have. Indonesia is the first trip loaded, the other
four become data entry rather than development.

Recommend B. Roughly a day more up front, and it takes me out of the loop for
every future copy change, which is the same argument that justified the rest of
this platform. It also means the client can fix a typo without waiting on a deploy.

New tables: `trip_highlights`, `trip_itinerary_days`, `trip_reviews`, `trip_faqs`,
plus snapshot fields on `trips`.

---

## Sequencing

1. Assets resized and converted. Quick, unblocks everything visual.
2. `/preview-all-in`. Self-contained, gives the client something to look at first.
3. Phase 5 schema, then Phase 2 mechanics, then Phase 3 sections. Schema first
   avoids building the sections twice.
4. Content load.
5. Client review on the preview URLs.
6. Promote whatever is approved. Roll the other four trips in as data.

---

## What I would not do

The brief says to replicate the G Adventures layout "pretty much exactly". Two
places where following it literally makes the page worse:

**"The Extras" column.** The brief already says ignore it, which is right. G
Adventures uses it to upsell paid add-ons. Every ALL IN activity is included, and
an empty extras column just invites the question of what costs more.

**"Request" on sold-out dates.** G Adventures shows "Request" where there is no
availability. We have no request-to-book flow, and building one creates a queue
somebody has to answer. Better to mark the date full and push to the next one, or
offer the custom-date picker we already have.
