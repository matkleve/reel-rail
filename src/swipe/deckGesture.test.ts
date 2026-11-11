import { describe, expect, it } from "vitest";

import { classifyThrow, DECIDE_PX, leanOf, VERDICT_RATING, verdictOf } from "./deckGesture";

describe("classifyThrow", () => {
  it("a barely moved finger is a tap", () => {
    expect(classifyThrow(3, -4, 120)).toEqual({ kind: "tap" });
  });

  it("each direction is one decision", () => {
    const slow = 1000;
    expect(classifyThrow(DECIDE_PX + 1, 10, slow)).toEqual({ kind: "decide", verdict: "keep" });
    expect(classifyThrow(-DECIDE_PX - 1, -10, slow)).toEqual({ kind: "decide", verdict: "discard" });
    expect(classifyThrow(5, -DECIDE_PX - 1, slow)).toEqual({ kind: "decide", verdict: "favorite" });
    expect(classifyThrow(-5, DECIDE_PX + 1, slow)).toEqual({ kind: "decide", verdict: "meh" });
  });

  it("a slow short drag springs back", () => {
    expect(classifyThrow(60, 0, 800)).toEqual({ kind: "none" });
  });

  it("a fast flick decides before the full distance", () => {
    expect(classifyThrow(50, 0, 60)).toEqual({ kind: "decide", verdict: "keep" });
  });

  it("a fast but tiny jitter is not a flick", () => {
    expect(classifyThrow(20, 0, 10)).toEqual({ kind: "none" });
  });
});

describe("verdicts", () => {
  it("diagonals go to the dominant axis", () => {
    expect(verdictOf(100, -99)).toBe("keep");
    expect(verdictOf(99, -100)).toBe("favorite");
  });

  it("set absolute ratings", () => {
    expect(VERDICT_RATING).toEqual({ keep: 1, discard: -2, favorite: 2, meh: -1 });
  });

  it("lean is 0…1 and only on the dominant axis", () => {
    expect(leanOf(DECIDE_PX * 2, 10)).toEqual({ keep: 1, discard: 0, favorite: 0, meh: 0 });
    expect(leanOf(-DECIDE_PX / 2, 0).discard).toBeCloseTo(0.5);
    expect(leanOf(10, -DECIDE_PX)).toEqual({ keep: 0, discard: 0, favorite: 1, meh: 0 });
  });
});
