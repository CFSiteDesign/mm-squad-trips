// Admin > Bookings > Cancel booking (Charlie, 4 Nov 2026). Stops any money still to come and frees the spots.
// It doesn't refund or email anyone. A balance that was already paid keeps saying so, so the record shows the money was taken.

export function cancelBookingValues(balanceStatus: unknown): Record<string, unknown> {
  const stillOwed = ["scheduled", "failed", "failed_final"].includes(String(balanceStatus ?? ""));
  return {
    status: "Cancelled",
    ...(stillOwed ? { balance_status: "cancelled", balance_next_attempt_at: null } : {}),
  };
}
