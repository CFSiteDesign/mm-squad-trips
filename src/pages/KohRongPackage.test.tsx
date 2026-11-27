import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Departure, Trip } from "@/types/trip";
import KohRongPackage from "./KohRongPackage";

// Koh Rong Ultimate Party Package (brief 27 Nov 2026): weekly, every Wednesday.
const wed = (date: string, extra: Partial<Departure> = {}): Departure => ({
  id: `dep-${date}`, departureId: `KRP-${date}`, date, spotsRemaining: 50, bookable: true, price: 220, strikethrough: null, ...extra,
});
const trip = {
  slug: "cambodia-post-festival",
  name: "Koh Rong Ultimate Party Package",
  days: 5,
  defaultPrice: 220,
  departures: [wed("2027-01-06"), wed("2026-12-09"), wed("2026-12-02"), wed("2026-12-16", { isPrivate: true }), wed("2026-12-23", { bookable: false })],
} as unknown as Trip;

vi.mock("@/lib/api", () => ({ fetchTrip: vi.fn(async () => trip) }));
vi.mock("@/lib/use-checkout", () => ({ useCheckout: () => ({}) }));
vi.mock("@/components/allin/CheckoutPanel", () => ({
  CheckoutPanel: ({ departure }: { departure: Departure }) => <div data-testid="checkout">{departure.date}</div>,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/koh-rong-party-package"]}>
        <KohRongPackage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Koh Rong Ultimate Party Package page", () => {
  it("offers every public bookable Wednesday, soonest first, and books the one picked", async () => {
    renderPage();
    expect(await screen.findByText("PICK YOUR WEDNESDAY CHECK-IN")).toBeTruthy();
    const chips = screen.getAllByRole("button", { pressed: false }).concat(screen.getAllByRole("button", { pressed: true }))
      .map((b) => b.textContent ?? "")
      .filter((t) => /^(MON|TUE|WED|THU|FRI|SAT|SUN) /.test(t))
      .sort();
    expect(chips).toEqual(["WED 2 DEC", "WED 6 JAN", "WED 9 DEC"].sort());
    // Private and closed weeks aren't offered.
    expect(screen.queryByText("WED 16 DEC")).toBeNull();
    expect(screen.queryByText("WED 23 DEC")).toBeNull();

    // The soonest week is picked to start with.
    expect(screen.getByTestId("checkout").textContent).toBe("2026-12-02");
    expect(screen.getByRole("button", { name: "WED 2 DEC" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "WED 6 JAN" }));
    expect(screen.getByTestId("checkout").textContent).toBe("2027-01-06");
    expect(screen.getByRole("button", { name: "WED 6 JAN" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("has the new name and no festival or December dates in the day plan", async () => {
    renderPage();
    await screen.findByText("PICK YOUR WEDNESDAY CHECK-IN");
    const hero = screen.getByRole("heading", { level: 1 });
    expect(hero.textContent).toBe("KOH RONGULTIMATE PARTYPACKAGE");
    const plan = screen.getByText("DAY BY DAY").parentElement as HTMLElement;
    expect(within(plan).getByText("WELCOME TO KOH RONG!")).toBeTruthy();
    expect(plan.textContent).not.toMatch(/festival|Dec\b|December/i);
    expect(document.body.textContent).not.toMatch(/post-festival|Transfer from Koh Sdach/i);
  });
});
