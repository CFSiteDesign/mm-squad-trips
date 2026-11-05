// The email 3 days before a balance is charged (T&Cs 4.2 on the Black Friday deal, on every auto-charged booking).
// Pure, covered by black-friday.test.ts. send-departure-reminders does the sending.

const DAY_MS = 86_400_000;
export const HEADS_UP_DAYS = 3;

export function headsUpDue(
  row: { balance_next_attempt_at?: string | null; created_at?: string | null; balance_amount?: unknown; group_size?: unknown },
  now = Date.now(),
): boolean {
  if (!row.balance_next_attempt_at || !(Number(row.balance_amount) * Number(row.group_size) > 0)) return false;
  const charge = Date.parse(row.balance_next_attempt_at);
  const toGo = charge - now;
  // The cron runs at the same time of day as the charge, so this catches 3, 2 and 1 days before if a run is missed.
  if (toGo > HEADS_UP_DAYS * DAY_MS || toGo < DAY_MS / 2) return false;
  // Their confirmation email has only just told them about this charge.
  return Date.parse(row.created_at ?? "") <= charge - (HEADS_UP_DAYS + 1) * DAY_MS;
}
