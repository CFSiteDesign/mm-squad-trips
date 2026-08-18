import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookingSuccess from "./BookingSuccess";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

describe("BookingSuccess — restored purchase tracking", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    window.dataLayer = [];
  });

  it("fires a purchase event with item_category4: 'All In' once booking data loads", async () => {
    invokeMock.mockResolvedValue({
      data: {
        booking: {
          bookingRef: "MM-1234",
          tripName: "Vietnam Adventure",
          departureDate: "2026-10-01",
          amountPaid: 99,
          balanceDue: 400,
          paymentType: "Deposit",
        },
      },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/booking-success?session_id=cs_test_abc123"]}>
        <BookingSuccess />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const purchaseEvent = (window.dataLayer ?? []).find((e) => e.event === "purchase");
      expect(purchaseEvent).toBeDefined();
    });

    const purchaseEvent = (window.dataLayer ?? []).find((e) => e.event === "purchase") as Record<string, unknown>;
    const ecommerce = purchaseEvent.ecommerce as Record<string, unknown>;
    expect(ecommerce.transaction_id).toBe("cs_test_abc123");
    expect(ecommerce.value).toBe(99);
    expect(purchaseEvent.conversion_type).toBe("all_in");

    const items = ecommerce.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      item_name: "Vietnam Adventure",
      item_category: "All In",
      item_category4: "All In",
      item_variant: "Deposit",
      price: 99,
    });
  });

  it("does not fire purchase twice for the same session id (dedupe guard)", async () => {
    invokeMock.mockResolvedValue({
      data: {
        booking: {
          bookingRef: "MM-5678",
          tripName: "Cambodia Coast to Coast",
          departureDate: "2026-11-01",
          amountPaid: 99,
          balanceDue: 300,
          paymentType: "Deposit",
        },
      },
      error: null,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/booking-success?session_id=cs_test_dedupe"]}>
        <BookingSuccess />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect((window.dataLayer ?? []).filter((e) => e.event === "purchase")).toHaveLength(1);
    });
    unmount();

    // Simulate a reload of the same success page (same session id).
    render(
      <MemoryRouter initialEntries={["/booking-success?session_id=cs_test_dedupe"]}>
        <BookingSuccess />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalled();
    });

    expect((window.dataLayer ?? []).filter((e) => e.event === "purchase")).toHaveLength(1);
  });
});
