// The production mount point can't be seen from a dev server, so pin it here.
import { describe, expect, it, vi } from "vitest";

async function load(pathname: string) {
  vi.resetModules();
  window.history.replaceState({}, "", pathname);
  return await import("./base-path");
}

describe("publicUrl", () => {
  it("addresses /public under /all-in-trips on madmonkeyhostels.com", async () => {
    const { BASE_PATH, publicUrl } = await load("/all-in-trips/cambodia");
    expect(BASE_PATH).toBe("/all-in-trips");
    expect(publicUrl("map/index.html?trip=cambodia&embed=1")).toBe("/all-in-trips/map/index.html?trip=cambodia&embed=1");
    expect(publicUrl("/videos/allin-feature.mp4")).toBe("/all-in-trips/videos/allin-feature.mp4");
  });

  it("stays at the root on lovable.app and the demo", async () => {
    const { BASE_PATH, publicUrl } = await load("/cambodia");
    expect(BASE_PATH).toBe("");
    expect(publicUrl("videos/allin-feature.mp4")).toBe("/videos/allin-feature.mp4");
  });
});
