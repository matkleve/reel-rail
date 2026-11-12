import { describe, expect, it } from "vitest";

import { exitFor } from "./flyOut";

const view = { w: 390, h: 844 };
/** Off screen: the card (centred, up to ~400 px) has moved more than half the screen plus half itself. */
const clears = (offset: number, side: number) => Math.abs(offset) > side / 2 + 200;

describe("exitFor", () => {
  it("a button throw leaves the verdict's way, off every screen", () => {
    const e = exitFor("good", { dx: 0, dy: 0 }, view);
    expect(clears(e.x, view.w)).toBe(true);
    expect(Math.abs(e.y)).toBeLessThan(e.x / 4);
    expect(e.rot).toBeGreaterThan(0);
    const up = exitFor("top", { dx: 0, dy: 0 }, view);
    expect(up.y).toBeLessThan(0);
    expect(clears(up.y, view.h)).toBe(true);
  });

  it("keeps going along the finger's throw, from where it was let go", () => {
    const e = exitFor("good", { dx: 120, dy: -60 }, view);
    expect(e.y).toBeLessThan(-60); // still rising, the way it was thrown
    expect(e.x / -e.y).toBeCloseTo(2, 1);
  });

  it("a throw drifting against its verdict leaves the verdict's way", () => {
    const e = exitFor("delete", { dx: -100, dy: 20 }, view);
    expect(e.y).toBeGreaterThan(0);
    expect(clears(e.y, view.h)).toBe(true);
  });
});
