import { describe, expect, it } from "vitest";

import { classifyThrow, DECIDE_PX, leanOf, VERDICT_RATING, verdictOf } from "./deckGesture";

describe("classifyThrow", () => {
  it("a barely moved finger is a tap", () => {
    expect(classifyThrow(3, -4, 120)).toEqual({ kind: "tap" });
  });

  it("each direction is one decision", () => {
    const slow = 1000;
    expect(classifyThrow(DECIDE_PX + 1, 10, slow)).toEqual({ kind: "decide", verdict: "good" });
    expect(classifyThrow(-DECIDE_PX - 1, -10, slow)).toEqual({ kind: "decide", verdict: "bad" });
    expect(classifyThrow(5, -DECIDE_PX - 1, slow)).toEqual({ kind: "decide", verdict: "top" });
    expect(classifyThrow(-5, DECIDE_PX + 1, slow)).toEqual({ kind: "decide", verdict: "delete" });
  });

  it("a slow short drag springs back", () => {
    expect(classifyThrow(60, 0, 800)).toEqual({ kind: "none" });
  });

  it("a fast flick decides before the full distance", () => {
    expect(classifyThrow(50, 0, 60)).toEqual({ kind: "decide", verdict: "good" });
  });

  it("a fast but tiny jitter is not a flick", () => {
    expect(classifyThrow(20, 0, 10)).toEqual({ kind: "none" });
  });
});

describe("verdicts", () => {
  it("diagonals go to the dominant axis", () => {
    expect(verdictOf(100, -99)).toBe("good");
    expect(verdictOf(99, -100)).toBe("top");
  });

  it("set absolute ratings", () => {
    expect(VERDICT_RATING).toEqual({ good: 1, bad: -1, top: 2, delete: -2 });
  });

  it("lean is 0…1 and only on the dominant axis", () => {
    expect(leanOf(DECIDE_PX * 2, 10)).toEqual({ good: 1, bad: 0, top: 0, delete: 0 });
    expect(leanOf(-DECIDE_PX / 2, 0).bad).toBeCloseTo(0.5);
    expect(leanOf(10, -DECIDE_PX)).toEqual({ good: 0, bad: 0, top: 1, delete: 0 });
  });
});
