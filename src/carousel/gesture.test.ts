import { axisOf, classify } from "./gesture";

describe("classify", () => {
  it("treats a barely-moving touch as a tap", () => {
    expect(classify(4, -6, 120)).toEqual({ kind: "tap" });
  });

  it("swipe left = next, swipe right = previous", () => {
    expect(classify(-80, 10, 300)).toEqual({ kind: "browse", steps: 1 });
    expect(classify(80, -10, 300)).toEqual({ kind: "browse", steps: -1 });
  });

  it("a longer swipe skips more cards, a flick one more, capped", () => {
    expect(classify(-500, 0, 600)).toEqual({ kind: "browse", steps: 3 });
    expect(classify(-500, 0, 200)).toEqual({ kind: "browse", steps: 4 });
    expect(classify(-5000, 0, 100)).toEqual({ kind: "browse", steps: 8 });
  });

  it("swipe up = better, swipe down = worse — one level per swipe", () => {
    expect(classify(10, -90, 200)).toEqual({ kind: "rate", delta: 1 });
    expect(classify(-10, 400, 200)).toEqual({ kind: "rate", delta: -1 });
  });

  it("ignores short drags that are neither tap nor swipe", () => {
    expect(classify(30, 20, 200)).toEqual({ kind: "none" });
  });
});

describe("axisOf", () => {
  it("locks to the dominant axis once past the tap slop", () => {
    expect(axisOf(3, 2)).toBeUndefined();
    expect(axisOf(-40, 12)).toBe("x");
    expect(axisOf(5, -30)).toBe("y");
  });
});
