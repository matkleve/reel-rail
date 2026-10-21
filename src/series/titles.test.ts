import { media } from "@/test-utils";

import { funnyTitle, monthYear, placeOf, suggestTitle } from "./titles";

describe("suggestTitle", () => {
  it("joins place, most common tag and month", () => {
    const list = [
      media("a", { place: "Porto", tags: ["Tram", "Food"], takenAt: "2026-10-03T10:00:00Z" }),
      media("b", { place: "Porto", tags: ["Tram"], takenAt: "2026-10-04T10:00:00Z" }),
    ];
    expect(suggestTitle(list)).toBe("Porto – Tram – Oct 26");
  });

  it("leaves out what it does not know instead of inventing it", () => {
    expect(suggestTitle([media("a", { path: "DCIM/100APPLE/a.jpg", takenAt: "2026-10-03T10:00:00Z" })])).toBe(
      "Oct 26",
    );
  });
});

describe("placeOf", () => {
  it("prefers the edited place", () => {
    expect(placeOf([media("a", { place: "Lisbon", path: "Porto/a.jpg" })])).toBe("Lisbon");
  });

  it("falls back to the nearest telling folder name, skipping camera folders", () => {
    expect(placeOf([media("a", { path: "Portugal/Porto/DCIM/100APPLE/a.jpg" })])).toBe("Porto");
    expect(placeOf([media("a", { path: "2026-10-03/a.jpg" })])).toBeUndefined();
  });
});

describe("monthYear", () => {
  it("uses the median date so one stray photo does not decide", () => {
    const list = [
      media("a", { takenAt: "2019-01-01T10:00:00Z" }),
      media("b", { takenAt: "2026-10-03T10:00:00Z" }),
      media("c", { takenAt: "2026-10-04T10:00:00Z" }),
    ];
    expect(monthYear(list)).toBe("Oct 26");
  });
});

describe("funnyTitle", () => {
  it("is deterministic for a given random source and uses the place", () => {
    const list = [media("a", { place: "Porto" })];
    const title = funnyTitle(list, () => 0);
    expect(title).toContain("Porto");
    expect(funnyTitle(list, () => 0)).toBe(title);
  });

  it("works with nothing known", () => {
    expect(funnyTitle([media("a", { path: "x.jpg" })], () => 0.5)).toContain("Somewhere");
  });
});
