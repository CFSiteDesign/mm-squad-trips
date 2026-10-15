# ALL IN bookings for the Loyalty page

For Dhany, 15 Oct 2026. The Loyalty account page shows an ALL IN guest where
to be on each day of their trip. This endpoint gives that page every data point
we take at checkout, plus the WhatsApp consent, read live from the bookings
database. Balance charges, cancellations and date changes show up straight
away, so there is nothing to sync.

## Call it

```
POST https://bilhhkzcmicygufsdfxi.supabase.co/functions/v1/loyalty-allin-bookings
x-loyalty-key: <key, shared privately by Charlie>
Content-Type: application/json
```

Server to server only. Never put the key in the browser.

| Body | Returns |
| --- | --- |
| `{ "email": "guest@example.com" }` | Every ALL IN booking that email is on, as the lead booker or as a named traveller. Case-insensitive. |
| `{ "emails": ["a@x.com", "b@y.com"] }` | Same, for up to 100 emails. |
| `{ "since": "2026-10-01T00:00:00Z" }` | Every booking changed since then (bulk sync, max 5,000 rows). |

Errors: `401` missing or wrong key, `400` bad body, `503` key not set up yet.

## Response

```json
{
  "count": 1,
  "bookings": [
    {
      "booking_ref": "GRP-VIE-004",
      "booking_id": "uuid",
      "role": "lead",
      "status": "confirmed",
      "payment_state": "deposit_paid",
      "booked_at": "2026-10-16T09:12:00Z",
      "updated_at": "2026-10-16T09:12:05Z",
      "trip": { "slug": "vietnam", "name": "ALL IN Vietnam", "country": "Vietnam", "days": 14, "nights": 13 },
      "departure": { "date": "2026-12-30", "end_date": "2027-01-12", "status": "confirmed" },
      "spots": 2,
      "traveller_mode": "crew",
      "solo": false,
      "lead": {
        "name": "Sam Rivers", "first_name": "Sam", "last_name": "Rivers",
        "email": "sam@example.com", "phone": "+44 7700 900000", "country": null, "age": null
      },
      "whatsapp": { "opt_in": true, "opted_in_at": "2026-10-16T09:11:40Z", "scope": "trip_updates", "phone": "+44 7700 900000" },
      "travellers": [
        { "spot": 1, "is_lead": true, "name": "Sam Rivers", "email": "sam@example.com", "age": null, "dietary": null },
        { "spot": 2, "is_lead": false, "name": null, "email": null, "age": null, "dietary": null, "cancelled": false }
      ],
      "payment": {
        "currency": "USD", "type": "deposit",
        "price_per_spot": 850, "discount_per_spot": 0, "final_per_spot": 850,
        "total": 1700, "paid": 198, "balance_due": 1502,
        "balance_due_date": "2026-12-23", "balance_status": "scheduled", "balance_charged_at": null
      },
      "codes": { "discount_code": null, "creator_code": null, "squad_code": "31907" },
      "source": {
        "heard_about_us": null, "staff_recommendation": null, "friends_mentioned": null,
        "utm_source": "instagram", "utm_medium": "paid", "utm_campaign": "allin-vietnam", "utm_content": null,
        "advisor_ref": null
      }
    }
  ]
}
```

Sorted by departure date. `role` only appears on email lookups.

## Fields

| Field | What it is |
| --- | --- |
| `booking_ref` | The guest-facing ref (`SOL-…` solo, `GRP-…` group). One entry per checkout. |
| `status` | `confirmed` or `cancelled`. |
| `payment_state` | `deposit_paid`, `paid_in_full`, `balance_failed` (retrying), `balance_failed_final`, `cancelled`, `refunded`. |
| `trip.slug` | `vietnam`, `vietnam-7`, `indonesia`, `indonesia-7`, `cambodia`, `thailand`. Use it with `departure.date` to lay out the day-by-day. |
| `departure.date` / `end_date` | Day 1 of the trip, and the day they leave (start + nights). Guests arrive at the first hostel the day before `date`. |
| `spots` | How many people are on the booking. |
| `traveller_mode` / `solo` | How they booked: `independent` (one person, solo) or `crew` (with friends). |
| `lead.*` | The person who booked and paid. |
| `whatsapp.*` | The checkout tick box (see below). |
| `travellers[]` | One per spot. Spot 1 is the lead. |
| `payment.*` | USD. `total` and `paid` cover all spots. `balance_due` is what is still to be charged on `balance_due_date` (7 days before departure). |
| `codes.*` | Discount code, creator code (a discount code flagged as a creator's), squad leader code used. |
| `source.*` | Where the booking came from. |

## Everything we take at checkout

**Main trip pages** (madmonkeyhostels.com/all-in-trips/vietnam etc.):
first name, second name, email, phone (with country code), trip, departure
date, number of spots, independent or crew, squad code, discount code (and a
second code when the first allows it), the WhatsApp box, and in the background
UTM tags and Adventure Advisor link. Nothing is asked about the other people on
the booking.

**Student pages** (/students/…) use an older form that also asks country, age,
where they heard about us, staff recommendation, friends' names, the solo box,
and for each extra traveller: name, email, age and dietary needs. These come
through in `lead.country`, `lead.age`, `source.*` and `travellers[]`.

## WhatsApp consent

- The box above Continue to Payment: "Keep me posted on WhatsApp. We'll send
  your day-by-day schedule, pickup times and anything you need before you go.
  Trip updates only. Opt out anytime." Unticked by default.
- It is **trip updates only (transactional), not marketing consent**. If
  marketing messages are wanted, the checkout needs a separate box with its own
  wording.
- Live on the main trip pages from 13 Oct 2026. Bookings before that were never
  asked, so they come back `opt_in: false`. The student pages don't have the
  box yet.
- The same consent goes to Klaviyo as WhatsApp transactional (Mich's flows).

## Worth knowing

- Only the lead booker's details are taken on the main pages, so a crew
  member's Loyalty login won't match a booking unless they booked it. Asking
  for each traveller's name and email at checkout would fix that.
- Stripe ids, GA ids and internal error messages are left out on purpose.
- The day-by-day itinerary itself isn't in this response. `trip.slug` and
  `departure.date` are enough to map it, and we can add a dated `days` list
  per booking if that's easier for the page.
