import { assertEquals } from "jsr:@std/assert@1";
import { cancelBookingValues } from "./booking-cancel.ts";

Deno.test("cancelling stops a balance that is still to come", () => {
  for (const status of ["scheduled", "failed", "failed_final"]) {
    assertEquals(cancelBookingValues(status), { status: "Cancelled", balance_status: "cancelled", balance_next_attempt_at: null }, status);
  }
});

Deno.test("cancelling leaves a paid or absent balance as it is", () => {
  for (const status of ["charged", "not_required", null, undefined]) {
    assertEquals(cancelBookingValues(status), { status: "Cancelled" }, String(status));
  }
});
