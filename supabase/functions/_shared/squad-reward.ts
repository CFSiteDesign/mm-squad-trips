// Squad leader rewards (Charlie, 14 Oct 2026): a leader whose code brings in
// 3 mates gets 50% off their own spot, and at 6 mates the trip is free.
//
// - Mates are travellers (every spot) on bookings made with the code. The
//   leader's own spot never counts, and cancelled spots stop counting.
// - A reward comes off the leader's unpaid balance first, on its own. Whatever
//   is left (balance already charged, paid in full, or worth more than the
//   balance) is a refund to their card, which waits for Approve in Squad admin.
// - Once applied, a reward is never taken back, even if a mate cancels later.
// - No booking under the leader's email yet: the reward waits, and is applied
//   when they book (stripe-webhook) or Squad admin links their booking ref.
// - Student squads (2 free spots at 10) stay with Hayley, by hand.
//
// Each step (half, free) is one squad_rewards row, claimed before any money
// moves so two webhooks firing together can't apply it twice.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@18.5.0";
import { APP_URL, OPS_NOTIFY_EMAILS, sendEmail, squadRewardLeaderEmail, squadRewardOpsEmail } from "./email.ts";

export const TIER_HALF = 3;
export const TIER_FREE = 6;
export const STUDENT_GOAL = 10;

export type Tier = "half" | "free";
const TIERS: Tier[] = ["half", "free"];
const TIER_AT: Record<Tier, number> = { half: TIER_HALF, free: TIER_FREE };
const TIER_LABEL: Record<Tier, string> = { half: "50% off", free: "a free trip" };

export type SquadLeader = {
  id: string;
  name: string | null;
  email: string | null;
  code: string | null;
  is_student: boolean | null;
  reward_booking_ref?: string | null;
};

export type Mate = {
  stripe_session_id: string;
  name: string;
  trip_slug: string | null;
  departure_date: string | null;
  booked_at: string;
};

export type RewardRow = {
  id: string;
  squad_leader_id: string;
  tier: Tier;
  status: "processing" | "waiting_booking" | "applied" | "awaiting_approval" | "declined" | "failed";
  mates_at_unlock: number;
  booking_id: string | null;
  booking_ref: string | null;
  amount: number;
  balance_cut: number;
  refund_due: number;
  refunded: number;
  stripe_refund_ids: string[];
  last_error: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

type LeaderBooking = {
  id: string;
  booking_ref: string | null;
  stripe_session_id: string | null;
  status: string | null;
  group_size: number | null;
  lead_name: string | null;
  final_price: number | null;
  amount_paid: number | null;
  discount_amount: number | null;
  balance_amount: number | null;
  balance_status: string | null;
  balance_due_date: string | null;
  stripe_payment_intent_id: string | null;
  stripe_balance_payment_intent_id: string | null;
  departures: { departure_date: string | null; trips: { name: string | null } | null } | null;
};

const BOOKING_COLS =
  "id,booking_ref,stripe_session_id,status,group_size,lead_name,final_price,amount_paid,discount_amount," +
  "balance_amount,balance_status,balance_due_date,stripe_payment_intent_id,stripe_balance_payment_intent_id," +
  "departures(departure_date,trips(name))";

// Balances that are still to be collected, so a reward can come off them.
const CUTTABLE = new Set(["scheduled", "failed", "failed_final", "manual"]);

const lower = (s: unknown) => String(s ?? "").trim().toLowerCase();
const isCancelled = (status: unknown) => lower(status) === "cancelled";
const cents = (n: unknown) => Math.round(Number(n ?? 0) * 100);
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const firstName = (s: unknown) => String(s ?? "").trim().split(/\s+/)[0] || "";
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Mates per leader: every live spot on bookings made with their code, minus the leader's own. */
export async function matesByLeader(sb: SupabaseClient, leaders: SquadLeader[]): Promise<Map<string, Mate[]>> {
  const out = new Map<string, Mate[]>(leaders.map((l) => [l.id, []]));
  if (leaders.length === 0) return out;

  const { data: sq, error } = await sb
    .from("squad_bookings")
    .select("squad_leader_id,booker_name,trip_slug,departure_date,stripe_session_id,created_at")
    .in("squad_leader_id", leaders.map((l) => l.id))
    .order("created_at", { ascending: true });
  if (error) throw new Error(`squad_bookings: ${error.message}`);

  type Spot = {
    stripe_session_id: string;
    status: string | null;
    spot_number: number | null;
    lead_name: string | null;
    lead_email: string | null;
    additional_travelers: Array<{ name?: string; email?: string }> | null;
  };
  const sessions = [...new Set((sq ?? []).map((s) => s.stripe_session_id as string).filter(Boolean))];
  const spotsBySession = new Map<string, Spot[]>();
  for (let i = 0; i < sessions.length; i += 100) {
    const { data: rows, error: rErr } = await sb
      .from("bookings")
      .select("stripe_session_id,status,spot_number,lead_name,lead_email,additional_travelers")
      .in("stripe_session_id", sessions.slice(i, i + 100));
    if (rErr) throw new Error(`bookings: ${rErr.message}`);
    for (const r of (rows ?? []) as Spot[]) {
      const arr = spotsBySession.get(r.stripe_session_id) ?? [];
      arr.push(r);
      spotsBySession.set(r.stripe_session_id, arr);
    }
  }

  const leaderEmail = new Map(leaders.map((l) => [l.id, lower(l.email)]));
  for (const s of sq ?? []) {
    const own = leaderEmail.get(s.squad_leader_id as string) ?? "";
    const spots = (spotsBySession.get(s.stripe_session_id as string) ?? [])
      .slice()
      .sort((a, b) => (Number(a.spot_number) || 1) - (Number(b.spot_number) || 1));
    const lead = spots.find((r) => (Number(r.spot_number) || 1) === 1);
    const extras = Array.isArray(lead?.additional_travelers) ? lead!.additional_travelers! : [];
    for (const r of spots) {
      if (isCancelled(r.status)) continue;
      const spot = Number(r.spot_number) || 1;
      const extra = spot > 1 ? extras[spot - 2] : null;
      // The leader's own spot: as the lead booker, or named as a traveller.
      if (own && (spot === 1 ? lower(r.lead_email) === own : lower(extra?.email) === own)) continue;
      const bookerName = r.lead_name || (s.booker_name as string | null) || "";
      const name = spot === 1
        ? bookerName || "Mate"
        : extra?.name?.trim() || (bookerName ? `${firstName(bookerName)}'s mate` : "Mate");
      out.get(s.squad_leader_id as string)?.push({
        stripe_session_id: s.stripe_session_id as string,
        name,
        trip_slug: (s.trip_slug as string | null) ?? null,
        departure_date: (s.departure_date as string | null) ?? null,
        booked_at: s.created_at as string,
      });
    }
  }
  return out;
}

/** The leader's own booking: a linked ref, else their next trip booked under their squad email. */
async function findLeaderBooking(sb: SupabaseClient, leader: SquadLeader): Promise<LeaderBooking | null> {
  let q = sb.from("bookings").select(BOOKING_COLS).eq("spot_number", 1);
  const ref = (leader.reward_booking_ref ?? "").trim().toUpperCase();
  if (ref) q = q.eq("booking_ref", ref);
  else if (leader.email) q = q.ilike("lead_email", likeEscape(leader.email.trim()));
  else return null;
  const { data, error } = await q;
  if (error) throw new Error(`leader booking: ${error.message}`);
  const live = ((data ?? []) as unknown as LeaderBooking[]).filter((b) => !isCancelled(b.status));
  const dep = (b: LeaderBooking) => b.departures?.departure_date ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = live.filter((b) => dep(b) >= today).sort((a, b) => dep(a).localeCompare(dep(b)));
  const past = live.filter((b) => dep(b) < today).sort((a, b) => dep(b).localeCompare(dep(a)));
  return upcoming[0] ?? past[0] ?? null;
}

async function loadBooking(sb: SupabaseClient, id: string): Promise<LeaderBooking | null> {
  const { data, error } = await sb.from("bookings").select(BOOKING_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`booking: ${error.message}`);
  return (data as unknown as LeaderBooking | null) ?? null;
}

/**
 * Takes up to `wantCents` off the booking's unpaid balance and returns what came
 * off. Every spot carries the same per-spot balance (charge-trip-balances charges
 * the lead row's balance_amount x group_size), so the cut is spread over the
 * spots, rounded in the leader's favour, and each spot's final price and
 * discount move with it so the admin's Balance Due stays right.
 */
async function cutBalance(sb: SupabaseClient, b: LeaderBooking, wantCents: number): Promise<number> {
  // All rows of the booking: by Stripe session where there is one, else by ref.
  const sel = sb.from("bookings").select("id,spot_number,group_size,balance_amount,balance_status,final_price,discount_amount");
  const { data: rows, error } = b.stripe_session_id
    ? await sel.eq("stripe_session_id", b.stripe_session_id)
    : await sel.eq("booking_ref", b.booking_ref ?? "");
  if (error) throw new Error(`balance read: ${error.message}`);
  const lead = (rows ?? []).find((r) => (Number(r.spot_number) || 1) === 1);
  if (!lead || !CUTTABLE.has(lower(lead.balance_status))) return 0;
  const spots = Math.max(1, Number(lead.group_size) || 1);
  const perCents = cents(lead.balance_amount);
  const totalCents = perCents * spots;
  const take = Math.min(totalCents, wantCents);
  if (take <= 0) return 0;
  const newPerCents = Math.floor((totalCents - take) / spots);
  const perCut = perCents - newPerCents;
  for (const r of rows ?? []) {
    const patch: Record<string, unknown> = {
      balance_amount: newPerCents / 100,
      final_price: (cents(r.final_price) - perCut) / 100,
      discount_amount: (cents(r.discount_amount) + perCut) / 100,
    };
    if (newPerCents === 0) Object.assign(patch, { balance_status: "not_required", balance_next_attempt_at: null });
    const { error: uErr } = await sb.from("bookings").update(patch).eq("id", r.id);
    if (uErr) throw new Error(`balance cut: ${uErr.message}`);
  }
  return perCut * spots;
}

/** What is still to be charged on the booking, in cents. */
async function balanceLeft(sb: SupabaseClient, b: LeaderBooking): Promise<number> {
  const { data } = await sb.from("bookings").select("balance_amount,balance_status,group_size").eq("id", b.id).maybeSingle();
  if (!data || !CUTTABLE.has(lower(data.balance_status))) return 0;
  return cents(data.balance_amount) * Math.max(1, Number(data.group_size) || 1);
}

/** Refunds up to `want` cents to the card(s) the booking was paid with: balance charge first, then the first payment. */
async function refundToCard(
  stripe: Stripe,
  b: LeaderBooking,
  want: number,
  key: string,
): Promise<{ cents: number; ids: string[] }> {
  const intents: string[] = [];
  if (b.stripe_balance_payment_intent_id) intents.push(b.stripe_balance_payment_intent_id);
  let first = b.stripe_payment_intent_id;
  // Paid-in-full bookings never stored their payment intent; it lives on the session.
  if (!first && b.stripe_session_id?.startsWith("cs_")) {
    const s = await stripe.checkout.sessions.retrieve(b.stripe_session_id);
    first = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
  }
  if (first && !intents.includes(first)) intents.push(first);

  let left = want;
  const ids: string[] = [];
  for (const id of intents) {
    if (left <= 0) break;
    const pi = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
    const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    const refundable = charge ? charge.amount - charge.amount_refunded : 0;
    const amount = Math.min(left, refundable);
    if (amount <= 0) continue;
    const r = await stripe.refunds.create(
      { payment_intent: id, amount, metadata: { kind: "squad_reward", booking_ref: b.booking_ref ?? "" } },
      { idempotencyKey: `${key}:${id}:${amount}` },
    );
    ids.push(r.id);
    left -= amount;
  }
  return { cents: want - left, ids };
}

/** Moves a refund onto the leader's own spot: money held and price both drop. */
async function recordRefund(sb: SupabaseClient, b: LeaderBooking, refundedCents: number) {
  const { data: lead } = await sb.from("bookings").select("amount_paid,final_price,discount_amount").eq("id", b.id).maybeSingle();
  if (!lead) return;
  await sb.from("bookings").update({
    amount_paid: Math.max(0, cents(lead.amount_paid) - refundedCents) / 100,
    final_price: Math.max(0, cents(lead.final_price) - refundedCents) / 100,
    discount_amount: (cents(lead.discount_amount) + refundedCents) / 100,
  }).eq("id", b.id);
}

export type SettleOptions = {
  /** Needed to refund. Without it, refunds just wait for approval. */
  stripe?: Stripe;
  /** Squad admin pressed Approve: send the refunds waiting on this leader. */
  approve?: boolean;
};
export type SettleResult = { leaderId: string; mates: number; actions: string[] };

/**
 * Brings a leader's rewards up to date with their mates count. Safe to call
 * any time (every squad booking, the leader's own booking, Squad admin).
 */
export async function settleSquadRewards(
  sb: SupabaseClient,
  leaderId: string,
  opts: SettleOptions = {},
): Promise<SettleResult> {
  const res: SettleResult = { leaderId, mates: 0, actions: [] };
  const { data: leaderRow, error } = await sb
    .from("squad_leaders")
    .select("id,name,email,code,is_student,reward_booking_ref")
    .eq("id", leaderId)
    .maybeSingle();
  if (error) throw new Error(`squad leader: ${error.message}`);
  const leader = leaderRow as SquadLeader | null;
  if (!leader) return { ...res, actions: ["leader not found"] };
  if (leader.is_student) return { ...res, actions: ["student squad: rewards stay with Hayley"] };

  const mates = (await matesByLeader(sb, [leader])).get(leader.id) ?? [];
  res.mates = mates.length;

  const { data: existing, error: eErr } = await sb.from("squad_rewards").select("*").eq("squad_leader_id", leader.id);
  if (eErr) throw new Error(`squad_rewards: ${eErr.message}`);
  const rows = new Map(((existing ?? []) as RewardRow[]).map((r) => [r.tier, r]));
  const stale = (r: RewardRow) => r.status === "processing" && Date.now() - Date.parse(r.updated_at) > 10 * 60 * 1000;
  const refundWaiting = (r: RewardRow) =>
    (r.status === "awaiting_approval" || r.status === "failed") && Number(r.refund_due) - Number(r.refunded) >= 0.01;

  const todo = TIERS.filter((t) => {
    const r = rows.get(t);
    const earned = mates.length >= TIER_AT[t];
    if (!r) return earned;
    if (refundWaiting(r)) return !!opts.approve;
    if (r.status === "waiting_booking" || r.status === "failed" || stale(r)) return earned;
    return false;
  });
  if (todo.length === 0) return res;

  const booking = await findLeaderBooking(sb, leader);
  // Both steps are worth half the leader's spot price before any squad reward.
  const half = rows.get("half");
  let stepCents = half && Number(half.amount) > 0 ? cents(half.amount) : booking ? Math.round(cents(booking.final_price) / 2) : 0;

  for (const tier of todo) {
    let row = rows.get(tier);
    const prevStatus = row?.status ?? null;
    const sendingRefund = !!row && refundWaiting(row);

    // Claim the step before anything moves.
    if (!row) {
      const { data: ins, error: iErr } = await sb
        .from("squad_rewards")
        .insert({ squad_leader_id: leader.id, tier, status: "processing", mates_at_unlock: mates.length })
        .select("*")
        .maybeSingle();
      if (iErr || !ins) {
        res.actions.push(`${tier}: already being applied`);
        continue;
      }
      row = ins as RewardRow;
    } else {
      const { data: claimed } = await sb
        .from("squad_rewards")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", row.status)
        .select("*");
      if (!claimed?.length) {
        res.actions.push(`${tier}: already being applied`);
        continue;
      }
      row = claimed[0] as RewardRow;
    }
    const save = (patch: Record<string, unknown>) =>
      sb.from("squad_rewards").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", row!.id);

    try {
      if (sendingRefund) {
        // Approve: send what's left of this step's refund, to the booking the
        // step was applied to.
        if (!opts.stripe) throw new Error("Stripe not configured");
        const applied = row.booking_id ? await loadBooking(sb, row.booking_id) : null;
        if (!applied) throw new Error("the booking this reward was applied to is gone, refund by hand");
        const due = cents(row.refund_due) - cents(row.refunded);
        const { cents: sent, ids } = await refundToCard(opts.stripe, applied, due, `squad-reward:${row.id}`);
        if (sent > 0) await recordRefund(sb, applied, sent);
        const refunded = cents(row.refunded) + sent;
        const done = refunded >= cents(row.refund_due);
        await save({
          status: done ? "applied" : "failed",
          refunded: refunded / 100,
          stripe_refund_ids: [...(row.stripe_refund_ids ?? []), ...ids],
          applied_at: done ? new Date().toISOString() : null,
          last_error: done ? null : `Only ${usd(sent)} of ${usd(due)} could go back to the card. Refund the rest by hand.`,
        });
        res.actions.push(`${tier}: refunded ${usd(sent)}${done ? "" : `, ${usd(due - sent)} still to refund by hand`}`);
        if (sent > 0) {
          await notifyLeader(leader, applied, tier, { refundSent: sent });
        }
        await notifyOps(leader, mates.length, tier, applied, done ? "refunded" : "refund_short", { refund: sent, short: due - sent });
        continue;
      }

      if (!booking) {
        await save({ status: "waiting_booking", mates_at_unlock: mates.length });
        res.actions.push(`${tier}: waiting for the leader to book`);
        if (prevStatus !== "waiting_booking") {
          await notifyOps(leader, mates.length, tier, null, "waiting");
        }
        continue;
      }

      // Apply: off the balance first, the rest waits as a refund.
      const amount = stepCents;
      const cut = amount > 0 ? await cutBalance(sb, booking, amount) : 0;
      const refundDue = Math.max(0, amount - cut);
      const status = refundDue > 0 ? "awaiting_approval" : "applied";
      await save({
        status,
        mates_at_unlock: mates.length,
        booking_id: booking.id,
        booking_ref: booking.booking_ref,
        amount: amount / 100,
        balance_cut: cut / 100,
        refund_due: refundDue / 100,
        applied_at: status === "applied" ? new Date().toISOString() : null,
        last_error: null,
      });
      if (tier === "half") stepCents = amount;
      res.actions.push(
        `${tier}: ${usd(amount)} on ${booking.booking_ref}, ${usd(cut)} off the balance` +
          (refundDue > 0 ? `, ${usd(refundDue)} refund waiting for approval` : ""),
      );
      if (cut > 0 || refundDue > 0) {
        await notifyLeader(leader, booking, tier, { cut, balanceLeft: await balanceLeft(sb, booking), refundPending: refundDue });
      }
      await notifyOps(leader, mates.length, tier, booking, refundDue > 0 ? "approval" : "applied", { cut, refund: refundDue, amount });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`squad reward ${tier} for ${leader.code} failed:`, msg);
      await save({ status: "failed", last_error: msg.slice(0, 500) });
      res.actions.push(`${tier}: failed, ${msg}`);
      await notifyOps(leader, mates.length, tier, booking, "failed", { error: msg });
    }
  }
  return res;
}

/** A squad leader booking their own trip: a reward they've already unlocked comes off it straight away. */
export async function settleForLeaderEmail(sb: SupabaseClient, email: string): Promise<SettleResult[]> {
  const clean = email.trim();
  if (!clean) return [];
  const { data, error } = await sb.from("squad_leaders").select("id,is_student").ilike("email", likeEscape(clean));
  if (error) throw new Error(`squad leaders: ${error.message}`);
  const out: SettleResult[] = [];
  for (const l of data ?? []) {
    if (l.is_student) continue;
    out.push(await settleSquadRewards(sb, l.id as string));
  }
  return out;
}

/** Every non-student leader, for the Squad admin "Check rewards" button. */
export async function settleAllSquadRewards(sb: SupabaseClient): Promise<SettleResult[]> {
  const { data, error } = await sb.from("squad_leaders").select("id,is_student");
  if (error) throw new Error(`squad leaders: ${error.message}`);
  const out: SettleResult[] = [];
  for (const l of data ?? []) {
    if (l.is_student) continue;
    try {
      const r = await settleSquadRewards(sb, l.id as string);
      if (r.actions.length) out.push(r);
    } catch (e) {
      out.push({ leaderId: l.id as string, mates: 0, actions: [`failed: ${e instanceof Error ? e.message : e}`] });
    }
  }
  return out;
}

async function notifyLeader(
  leader: SquadLeader,
  b: LeaderBooking,
  tier: Tier,
  v: { cut?: number; balanceLeft?: number; refundPending?: number; refundSent?: number },
) {
  if (!leader.email) return;
  const { subject, html } = squadRewardLeaderEmail({
    leaderName: firstName(leader.name) || "captain",
    free: tier === "free",
    tripName: b.departures?.trips?.name || "your trip",
    bookingRef: b.booking_ref || "",
    cut: v.cut ? usd(v.cut) : "",
    balanceLeft: v.cut ? usd(v.balanceLeft ?? 0) : "",
    chargeDate: fmtDate(b.balance_due_date),
    refundPending: v.refundPending ? usd(v.refundPending) : "",
    refundSent: v.refundSent ? usd(v.refundSent) : "",
  });
  await sendEmail({ to: leader.email, subject, html, templateName: "squad_reward_applied" }).catch((e) =>
    console.warn("squad reward email failed", e),
  );
}

async function notifyOps(
  leader: SquadLeader,
  mates: number,
  tier: Tier,
  b: LeaderBooking | null,
  event: "waiting" | "applied" | "approval" | "refunded" | "refund_short" | "failed",
  v: { cut?: number; refund?: number; amount?: number; short?: number; error?: string } = {},
) {
  const who = `${leader.name ?? "A squad leader"} (code ${leader.code ?? "?"})`;
  const ref = b?.booking_ref ?? "";
  const lines: Record<typeof event, string> = {
    waiting: `${who} has ${mates} mates booked and unlocked ${TIER_LABEL[tier]}, but has no ALL IN booking under ${leader.email}. It applies by itself when they book with that email. If they booked under another email, add their booking ref in Admin > Squad leaders.`,
    applied: `${who} has ${mates} mates booked and unlocked ${TIER_LABEL[tier]}. ${usd(v.cut ?? 0)} came off the balance on ${ref}. Nothing to do.`,
    approval: `${who} has ${mates} mates booked and unlocked ${TIER_LABEL[tier]} (${usd(v.amount ?? 0)}). ${v.cut ? `${usd(v.cut)} came off the balance on ${ref}. ` : ""}${usd(v.refund ?? 0)} has to go back to their card: approve it in Admin > Squad leaders.`,
    refunded: `${usd(v.refund ?? 0)} refunded to ${who} for ${TIER_LABEL[tier]} on ${ref}.`,
    refund_short: `Only ${usd(v.refund ?? 0)} could be refunded to ${who} on ${ref}. ${usd(v.short ?? 0)} still has to go back by hand in Stripe.`,
    failed: `The ${TIER_LABEL[tier]} reward for ${who}${ref ? ` on ${ref}` : ""} did not go through: ${v.error ?? "unknown error"}. Check Admin > Squad leaders.`,
  };
  const { subject, html } = squadRewardOpsEmail({
    subject: `Squad reward: ${leader.name ?? leader.code ?? ""}, ${TIER_LABEL[tier]}${event === "approval" ? " (approve refund)" : event === "failed" ? " (failed)" : ""}`,
    body: lines[event],
    adminUrl: `${APP_URL}/admin`,
  });
  await sendEmail({ to: OPS_NOTIFY_EMAILS, subject, html, templateName: "squad_reward_ops" }).catch((e) =>
    console.warn("squad reward ops email failed", e),
  );
}
