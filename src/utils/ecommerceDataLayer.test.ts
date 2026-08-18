import { describe, expect, it } from "vitest";
import { buildGa4Item, buildTripEcommerceItem, ITEM_CATEGORY4_ALL_IN } from "./ecommerceDataLayer";

describe("buildGa4Item — item_category4", () => {
  it("always sets item_category4 to 'All In', regardless of input", () => {
    const item = buildGa4Item({
      item_category: "All In",
      item_list_id: "all-in-trips",
      item_list_name: "All In Trips",
    });
    expect(item.item_category4).toBe(ITEM_CATEGORY4_ALL_IN);
    expect(item.item_category4).toBe("All In");
  });

  it("cannot be overridden via input (no field for it on Ga4ItemInput)", () => {
    const attemptedOverride = {
      item_category: "All In",
      item_category4: "Something Else",
      item_list_id: "all-in-trips",
      item_list_name: "All In Trips",
    };
    const item = buildGa4Item(attemptedOverride as Parameters<typeof buildGa4Item>[0]);
    expect(item.item_category4).toBe("All In");
  });
});

describe("buildTripEcommerceItem — used by view_item and begin_checkout", () => {
  it("includes item_category4: 'All In' on the built item", () => {
    const item = buildTripEcommerceItem(
      { slug: "vietnam", name: "Vietnam Adventure" },
      { price: 850 },
    );
    expect(item.item_category4).toBe("All In");
    expect(item.item_category).toBe("All In");
  });
});
