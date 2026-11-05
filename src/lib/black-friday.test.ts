import { afterEach, describe, expect, it, vi } from "vitest";
import { depositText, earlyAccessWaiting, initSaleAccess, saleKey, saleOff } from "./black-friday";
import { paymentLine } from "./trip-helpers";

const FRIDAY = new Date("2026-11-27T00:00:00+08:00");
const THURSDAY_NOON = new Date("2026-11-26T12:00:00+08:00");
const FAR_OFF = "2027-02-01";
// sha256("test-key")
const HASHES = { "62af8704764faf8ea82fc61ce9c4c3908b6cb97d463a634e9e587d7c885db0ef": "early" as const };

afterEach(async () => {
  vi.useRealTimers();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  await initSaleAccess(HASHES);
});

describe("Black Friday on the site", () => {
  it("is off before the sale and stays at $99", () => {
    vi.useFakeTimers({ now: new Date("2026-11-20T00:00:00Z") });
    expect(saleOff("vietnam")).toBe(0);
    expect(depositText("vietnam")).toBe("$99");
    expect(paymentLine(FAR_OFF, 2, 850, "vietnam")).toMatchObject({ type: "deposit", amount: 198 });
  });

  it("takes the deposit to $0 during the sale, except on Thailand", () => {
    vi.useFakeTimers({ now: FRIDAY });
    expect(saleOff("vietnam")).toBe(200);
    expect(saleOff("laos")).toBe(100);
    expect(saleOff("vietnam-7")).toBe(100);
    expect(paymentLine(FAR_OFF, 2, 650, "vietnam")).toMatchObject({ type: "deposit", amount: 0, label: "$0 deposit holds your spot" });
    expect(saleOff("thailand")).toBe(0);
    expect(depositText("thailand")).toBe("$99");
    expect(paymentLine(FAR_OFF, 1, 340, "thailand")).toMatchObject({ type: "deposit", amount: 99 });
  });

  it("still takes full payment for a departure inside 7 days", () => {
    vi.useFakeTimers({ now: FRIDAY });
    expect(paymentLine("2026-11-30", 1, 650, "vietnam")).toMatchObject({ type: "full", amount: 650 });
  });

  it("leaves departures before 30 Nov out of it", () => {
    vi.useFakeTimers({ now: FRIDAY });
    expect(saleOff("vietnam", "2026-11-29")).toBe(0);
    expect(saleOff("vietnam", "2026-11-30")).toBe(200);
  });

  it("only the real link opens early access, from Thursday noon, and it's remembered on the device", async () => {
    vi.useFakeTimers({ now: new Date(THURSDAY_NOON.getTime() - 1), toFake: ["Date"] });
    window.history.replaceState({}, "", "/?early=made-up");
    await initSaleAccess(HASHES);
    expect(saleKey()).toBeUndefined();
    expect(earlyAccessWaiting()).toBe(false);

    window.history.replaceState({}, "", "/vietnam?early=test-key&utm_source=klaviyo");
    await initSaleAccess(HASHES);
    expect(saleKey()).toBe("test-key");
    expect(earlyAccessWaiting()).toBe(true);
    expect(saleOff("vietnam")).toBe(0);

    vi.setSystemTime(THURSDAY_NOON);
    expect(earlyAccessWaiting()).toBe(false);
    expect(saleOff("vietnam")).toBe(200);
    expect(depositText("vietnam")).toBe("$0");

    window.history.replaceState({}, "", "/");
    await initSaleAccess(HASHES);
    expect(saleOff("vietnam")).toBe(200);
  });

  it("nobody without the link gets it on Thursday", async () => {
    vi.useFakeTimers({ now: THURSDAY_NOON, toFake: ["Date"] });
    await initSaleAccess(HASHES);
    expect(saleOff("vietnam")).toBe(0);
    expect(depositText("vietnam")).toBe("$99");
  });
});
