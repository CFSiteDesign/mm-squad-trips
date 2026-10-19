// deno test --allow-env supabase/functions/_shared/squad-reward.test.ts
// Squad rewards against an in-memory stand-in for the Supabase tables.
import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@18.5.0";
import { matesByLeader, settleForLeaderEmail, settleSquadRewards } from "./squad-reward.ts";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

// Just enough of the PostgREST builder for squad-reward.ts.
function fakeDb(tables: Tables): SupabaseClient {
  let nextId = 1;
  class Q {
    filters: Array<(r: Row) => boolean> = [];
    op: "select" | "insert" | "update" = "select";
    payload: Row = {};
    returning = false;
    single = false;
    constructor(public table: string) {}
    select() {
      if (this.op !== "select") this.returning = true;
      return this;
    }
    insert(p: Row) {
      this.op = "insert";
      this.payload = p;
      return this;
    }
    update(p: Row) {
      this.op = "update";
      this.payload = p;
      return this;
    }
    eq(c: string, v: unknown) {
      this.filters.push((r) => r[c] === v);
      return this;
    }
    in(c: string, vs: unknown[]) {
      this.filters.push((r) => vs.includes(r[c]));
      return this;
    }
    ilike(c: string, pattern: string) {
      const want = pattern.replace(/\\(.)/g, "$1").toLowerCase();
      this.filters.push((r) => String(r[c] ?? "").toLowerCase() === want);
      return this;
    }
    order() {
      return this;
    }
    limit() {
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    run(): { data: unknown; error: { message: string } | null } {
      const rows = (tables[this.table] ??= []);
      if (this.op === "insert") {
        if (
          this.table === "squad_rewards" &&
          rows.some((r) => r.squad_leader_id === this.payload.squad_leader_id && r.tier === this.payload.tier)
        ) return { data: null, error: { message: "duplicate key value" } };
        const now = new Date().toISOString();
        const row: Row = {
          id: `r${nextId++}`, amount: 0, balance_cut: 0, refund_due: 0, refunded: 0, stripe_refund_ids: [],
          last_error: null, applied_at: null, booking_id: null, booking_ref: null, created_at: now, updated_at: now,
          ...this.payload,
        };
        rows.push(row);
        return { data: this.single ? row : [row], error: null };
      }
      const hit = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") {
        for (const r of hit) Object.assign(r, this.payload);
        return { data: this.returning ? hit : null, error: null };
      }
      return { data: this.single ? hit[0] ?? null : hit, error: null };
    }
    then<T>(resolve: (v: { data: unknown; error: { message: string } | null }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }
  }
  return { from: (t: string) => new Q(t) } as unknown as SupabaseClient;
}

const DEC30 = { departure_date: "2099-12-30", trips: { name: "Vietnam 14 Days" } };
const leader = (over: Row = {}): Row => ({
  id: "L1", name: "James Gunson", email: "james@example.com", code: "31907", is_student: false, reward_booking_ref: null, ...over,
});
// A booking: one row per spot, every spot carrying the same per-spot balance.
function booking(ref: string, session: string, email: string, spots: number, over: Row = {}): Row[] {
  return Array.from({ length: spots }, (_, i) => ({
    id: `${ref}-${i + 1}`, booking_ref: ref, stripe_session_id: session, status: "Confirmed", spot_number: i + 1,
    group_size: spots, lead_name: email.split("@")[0], lead_email: email, final_price: 850, amount_paid: 99,
    discount_amount: 0, balance_amount: 751, balance_status: "scheduled", balance_due_date: "2099-12-23",
    stripe_payment_intent_id: `pi_${ref}`, stripe_balance_payment_intent_id: null, departures: DEC30,
    additional_travelers: i === 0 && spots > 1
      ? Array.from({ length: spots - 1 }, (_, k) => ({ name: `Friend ${k + 1}`, email: `f${k + 1}@x.com` }))
      : null,
    ...over,
  }));
}
const squad = (session: string): Row => ({
  squad_leader_id: "L1", booker_name: null, trip_slug: "vietnam", departure_date: "2099-12-30",
  stripe_session_id: session, created_at: "2026-08-01T00:00:00Z",
});

function setup(mates: Row[][], own: Row[] | null) {
  const bookings = [...mates.flat(), ...(own ?? [])];
  const squadRows = mates.map((m) => squad(m[0].stripe_session_id as string));
  const tables: Tables = { squad_leaders: [leader()], squad_bookings: squadRows, bookings, squad_rewards: [] };
  return { tables, sb: fakeDb(tables) };
}
const solo = (n: number) => booking(`SOL-${n}`, `cs_m${n}`, `mate${n}@x.com`, 1);
const lead = (t: Tables, ref: string) => t.bookings.find((b) => b.booking_ref === ref && b.spot_number === 1)!;
const quiet = () => {
  const warn = console.warn, log = console.log;
  console.warn = () => {};
  console.log = () => {};
  return () => {
    console.warn = warn;
    console.log = log;
  };
};

Deno.test("mates: every spot counts, the leader's own spot and cancelled spots don't", async () => {
  const own = booking("SOL-J", "cs_own", "james@example.com", 1);
  const group = booking("GRP-1", "cs_g", "mate9@x.com", 3);
  const cancelled = booking("SOL-C", "cs_c", "gone@x.com", 1, { status: "Cancelled" });
  const { sb } = setup([group, cancelled, own], null);
  const m = (await matesByLeader(sb, [leader() as never])).get("L1")!;
  assertEquals(m.map((x) => x.name), ["mate9", "Friend 1", "Friend 2"]);
});

Deno.test("3 mates, leader on a deposit: 50% comes off the balance on its own", async () => {
  const restore = quiet();
  const own = booking("SOL-J", "cs_own", "james@example.com", 1);
  const { tables, sb } = setup([solo(1), solo(2), solo(3)], own);
  const r = await settleSquadRewards(sb, "L1");
  restore();
  assertEquals(r.mates, 3);
  const row = lead(tables, "SOL-J");
  assertEquals([row.balance_amount, row.final_price, row.discount_amount, row.balance_status], [326, 425, 425, "scheduled"]);
  assertEquals(tables.squad_rewards.map((x) => [x.tier, x.status, x.balance_cut, x.refund_due]), [["half", "applied", 4.25e2, 0]]);
  // Running again changes nothing.
  const again = await settleSquadRewards(sb, "L1");
  assertEquals(again.actions, []);
  assertEquals(row.balance_amount, 326);
});

Deno.test("6 mates on a deposit: balance goes to zero, the deposit waits as a refund", async () => {
  const restore = quiet();
  const own = booking("SOL-J", "cs_own", "james@example.com", 1);
  const { tables, sb } = setup([1, 2, 3, 4, 5, 6].map(solo), own);
  await settleSquadRewards(sb, "L1");
  restore();
  const row = lead(tables, "SOL-J");
  assertEquals([row.balance_amount, row.balance_status, row.final_price], [0, "not_required", 99]);
  const byTier = Object.fromEntries(tables.squad_rewards.map((x) => [x.tier, x]));
  assertEquals([byTier.half.status, byTier.half.balance_cut], ["applied", 425]);
  assertEquals([byTier.free.status, byTier.free.amount, byTier.free.balance_cut, byTier.free.refund_due], ["awaiting_approval", 425, 326, 99]);
});

Deno.test("paid in full: nothing moves until Approve, then Stripe refunds it", async () => {
  const restore = quiet();
  const own = booking("SOL-J", "cs_own", "james@example.com", 1, {
    amount_paid: 850, balance_amount: 0, balance_status: "not_required",
  });
  const { tables, sb } = setup([solo(1), solo(2), solo(3)], own);
  await settleSquadRewards(sb, "L1");
  assertEquals(tables.squad_rewards[0].status, "awaiting_approval");
  assertEquals(lead(tables, "SOL-J").amount_paid, 850);

  const refunds: Array<{ payment_intent: string; amount: number }> = [];
  const stripe = {
    checkout: { sessions: { retrieve: () => Promise.resolve({ payment_intent: "pi_x" }) } },
    paymentIntents: {
      retrieve: (id: string) => Promise.resolve({ id, latest_charge: { amount: 85000, amount_refunded: 0 } }),
    },
    refunds: {
      create: (p: { payment_intent: string; amount: number }) => {
        refunds.push(p);
        return Promise.resolve({ id: `re_${refunds.length}` });
      },
    },
  } as unknown as Stripe;
  await settleSquadRewards(sb, "L1", { stripe, approve: true });
  restore();
  assertEquals(refunds.map((x) => [x.payment_intent, x.amount]), [["pi_SOL-J", 42500]]);
  const row = lead(tables, "SOL-J");
  assertEquals([row.amount_paid, row.final_price, row.discount_amount], [425, 425, 425]);
  assertEquals([tables.squad_rewards[0].status, tables.squad_rewards[0].refunded], ["applied", 425]);
});

Deno.test("no booking yet: waits, then applies when the leader books", async () => {
  const restore = quiet();
  const { tables, sb } = setup([solo(1), solo(2), solo(3)], null);
  await settleSquadRewards(sb, "L1");
  assertEquals(tables.squad_rewards[0].status, "waiting_booking");
  tables.bookings.push(...booking("SOL-J", "cs_own", "James@Example.com", 1));
  await settleForLeaderEmail(sb, "James@Example.com");
  restore();
  assertEquals(tables.squad_rewards[0].status, "applied");
  assertEquals(lead(tables, "SOL-J").balance_amount, 326);
});

Deno.test("a group the leader booked: the cut is spread over the spots and the total is exact or in their favour", async () => {
  const restore = quiet();
  const own = booking("GRP-J", "cs_own", "james@example.com", 3);
  const { tables, sb } = setup([solo(1), solo(2), solo(3)], own);
  await settleSquadRewards(sb, "L1");
  restore();
  const rows = tables.bookings.filter((b) => b.booking_ref === "GRP-J");
  const per = rows.map((b) => b.balance_amount as number);
  assertEquals(new Set(per).size, 1);
  const total = Math.round(per[0] * 100) * 3;
  // 3 x 751 = 2253, minus 425 = 1828, rounded down per spot.
  assertEquals(total, 182799);
  assertEquals(tables.squad_rewards[0].balance_cut, 425.01);
});

Deno.test("cancelled mates stop counting before a reward is applied, not after", async () => {
  const restore = quiet();
  const own = booking("SOL-J", "cs_own", "james@example.com", 1);
  const m3 = solo(3);
  m3[0].status = "Cancelled";
  const { tables, sb } = setup([solo(1), solo(2), m3], own);
  assertEquals((await settleSquadRewards(sb, "L1")).actions, []);
  m3[0].status = "Confirmed";
  await settleSquadRewards(sb, "L1");
  m3[0].status = "Cancelled";
  await settleSquadRewards(sb, "L1");
  restore();
  assertEquals(tables.squad_rewards[0].status, "applied");
  assertEquals(lead(tables, "SOL-J").balance_amount, 326);
});

Deno.test("student squads are left to Hayley", async () => {
  const { tables, sb } = setup([1, 2, 3].map(solo), booking("SOL-J", "cs_own", "james@example.com", 1));
  tables.squad_leaders[0].is_student = true;
  const r = await settleSquadRewards(sb, "L1");
  assertEquals(tables.squad_rewards.length, 0);
  assertEquals(r.actions, ["student squad: rewards stay with Hayley"]);
});
