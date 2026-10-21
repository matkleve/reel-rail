import { emptyReel } from "@/types";
import { media } from "@/test-utils";

import { setPlace } from "./actions";
import { useReel } from "./useReel";

function seed() {
  const list = ["a", "b", "c", "d"].map((id, i) =>
    media(id, { takenAt: new Date(Date.UTC(2026, 9, 14, 10, i)).toISOString() }),
  );
  useReel.getState().load({ ...emptyReel(), media: Object.fromEntries(list.map((m) => [m.id, m])) });
  useReel.getState().setFilters({ rating: "all", neverExported: false, tags: [] });
}

const s = () => useReel.getState();
const rating = (id: string) => s().reel.media[id]!.rating;

beforeEach(seed);

describe("rating", () => {
  it("clamps between discard and favorite (five levels)", () => {
    s().rate(1);
    s().rate(1);
    s().rate(1);
    expect(rating("a")).toBe(2);
    for (let i = 0; i < 6; i++) s().rate(-1);
    expect(rating("a")).toBe(-2);
  });

  it("does not push an undo step for a no-op at the limit", () => {
    s().rate(-1);
    s().rate(-1);
    s().rate(-1);
    expect(s().undoStack).toHaveLength(2);
  });

  it("undoes the last rating change (Z)", () => {
    s().rate(1);
    s().step(1);
    s().rate(1);
    s().undo();
    expect(rating("b")).toBe(0);
    expect(rating("a")).toBe(1);
    expect(s().currentId).toBe("b");
  });

  it("rates the whole selection at once and undoes it as one step", () => {
    s().step(1, true);
    s().step(1, true);
    s().rate(1);
    expect(["a", "b", "c", "d"].map(rating)).toEqual([1, 1, 1, 0]);
    s().undo();
    expect(["a", "b", "c"].map(rating)).toEqual([0, 0, 0]);
  });
});

describe("navigation and selection", () => {
  it("shift+arrow extends a range from the anchor in both directions", () => {
    s().setCurrent("c");
    s().step(-1, true);
    s().step(-1, true);
    expect([...s().selection].sort()).toEqual(["a", "b", "c"]);
    s().step(1, true);
    expect([...s().selection].sort()).toEqual(["b", "c"]);
  });

  it("ctrl+click toggles single items and keeps the item you were on", () => {
    s().setCurrent("a");
    s().setCurrent("c", "toggle");
    expect([...s().selection].sort()).toEqual(["a", "c"]);
    s().setCurrent("a", "toggle");
    expect([...s().selection]).toEqual(["c"]);
  });

  it("Esc clears the selection", () => {
    s().step(1, true);
    s().clearSelection();
    expect(s().selection.size).toBe(0);
  });

  it("arrow keys skip media that the filter hides", () => {
    s().setCurrent("c");
    s().rate(1);
    s().setCurrent("a");
    s().setFilters({ rating: "good" });
    s().step(1);
    expect(s().currentId).toBe("c");
  });

  it("stops at the ends", () => {
    s().step(-1);
    expect(s().currentId).toBe("a");
  });
});

describe("series", () => {
  it("marks every member as exported", () => {
    s().addSeries({ id: "s1", title: "T", mediaIds: ["a", "b"], createdAt: "" });
    s().markExported("s1", "Exports/T");
    expect(s().reel.media.a!.exportedTo[0]?.series).toBe("s1");
    expect(s().reel.media.c!.exportedTo).toEqual([]);
    expect(s().reel.series[0]!.exportedPath).toBe("Exports/T");
  });
});

describe("place", () => {
  it("sets and clears", () => {
    setPlace(["a", "b"], "  Porto ");
    expect(s().reel.media.b!.place).toBe("Porto");
    setPlace(["a"], "");
    expect(s().reel.media.a!.place).toBeUndefined();
  });
});
