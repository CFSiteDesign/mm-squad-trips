# Squad leader rewards

Automated 14 Oct 2026 (Charlie). Code: `supabase/functions/_shared/squad-reward.ts`,
tests next to it (`deno test --allow-env supabase/functions/_shared/squad-reward.test.ts`).

## The rules

- **3 mates booked: 50% off the leader's own spot. 6 mates: free.**
- A mate is a traveller (every spot) on a booking made with the leader's code.
  A crew of 3 booked in one checkout counts as 3.
- The leader's own spot never counts, even if they booked with their own code.
- Cancelled spots stop counting while a reward is still to be applied. A reward
  already applied is never taken back.
- Student squads (2 free spots at 10) are unchanged: Hayley books them by hand.

## What happens when a leader hits 3 or 6

1. The leader gets the "unlocked" email (now says the reward is applied
   automatically).
2. The reward (half the leader's spot price per step) comes **off their unpaid
   balance automatically**. They get an email with the new balance and charge
   date. Ops get a note.
3. Anything the balance can't cover (balance already charged, paid in full, or
   the free step is worth more than what's left) becomes a **refund waiting for
   approval**. Ops get an email; someone presses **Approve refund** in
   Admin > Squad leaders > Details. Stripe refunds the card (balance charge
   first, then the first payment) and the leader gets a "refund on its way"
   email. **Decline** closes it without paying.
4. No booking under the leader's squad email yet: the reward waits and applies
   the moment they book. If they booked under a different email, paste their
   booking ref into **Link booking** on their row.

The leader's dashboard shows the reward and what came off.

**Check rewards** (top right of Squad leaders) runs every leader again. Use it
after the first deploy, or after fixing a booking by hand.

## Where it runs

- `stripe-webhook`: every booking with a squad code, and every booking by a
  leader (their own trip).
- `squad-admin`: Check rewards, Approve refund, Decline, Link booking.
- `squad-dashboard`: the mates count and reward status for the leader.
- Table `squad_rewards` (one row per leader per step), column
  `squad_leaders.reward_booking_ref`. Migration `20261014090000_squad_rewards.sql`.

## Money details

- Balance cuts on a crew booking are spread evenly over the spots (the charge
  job charges the lead row's per-spot balance x spots), rounded in the leader's
  favour, so the total can be a cent or two more than half.
- Final price, discount and (for refunds) amount paid move with the reward, so
  Balance Due in the admin stays right.
