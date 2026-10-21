import { media } from "@/test-utils";
import type { Media } from "@/types";

import { DAY_WIDTH, ITEM_GAP, SIZE, firstVisible, gapWidth, layoutTimeline } from "./layout";

function build(list: Media[]) {
  return layoutTimeline(
    list.map((m) => m.id),
    Object.fromEntries(list.map((m) => [m.id, m])),
  );
}

describe("layoutTimeline", () => {
  it("starts with a day marker and sizes items by rating", () => {
    const l = build([media("a", { rating: 2 }), media("b", { rating: -1, takenAt: "2026-10-14T10:01:00Z" })]);
    expect(l.slots[0]).toMatchObject({ kind: "day", x: 0 });
    expect(l.byId.get("a")).toMatchObject({ x: DAY_WIDTH, w: SIZE[2] });
    expect(l.byId.get("b")).toMatchObject({ x: DAY_WIDTH + SIZE[2] + ITEM_GAP, w: SIZE[-1] });
  });

  it("inserts a gap for pauses over 3 hours, and nothing for shorter ones", () => {
    const l = build([
      media("a", { takenAt: "2026-10-14T08:00:00Z" }),
      media("b", { takenAt: "2026-10-14T10:59:00Z" }),
      media("c", { takenAt: "2026-10-14T16:00:00Z" }),
    ]);
    const gaps = l.slots.filter((s) => s.kind === "gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ w: gapWidth(5.0166666666666666) });
  });

  it("starts a new day marker when the local date changes, labelled with the commonest place", () => {
    const l = build([
      media("a", { takenAt: "2026-10-14T12:00:00", place: "Porto" }),
      media("b", { takenAt: "2026-10-15T12:00:00", place: "Lisbon" }),
      media("c", { takenAt: "2026-10-15T12:30:00", place: "Lisbon" }),
      media("d", { takenAt: "2026-10-15T12:40:00", place: "Sintra" }),
    ]);
    const days = l.slots.filter((s) => s.kind === "day");
    expect(days.map((d) => d.kind === "day" && d.place)).toEqual(["Porto", "Lisbon"]);
  });

  it("grows the rail when an item is rated up — neighbours move right", () => {
    const a = media("a");
    const b = media("b", { takenAt: "2026-10-14T10:00:01Z" });
    const before = build([a, b]).byId.get("b")!.x;
    const after = build([{ ...a, rating: 2 }, b]).byId.get("b")!.x;
    expect(after - before).toBe(SIZE[2] - SIZE[0]);
  });

  it("caps very long pauses", () => {
    expect(gapWidth(24 * 30)).toBe(120);
    expect(gapWidth(3.01)).toBeGreaterThan(20);
  });
});

describe("firstVisible", () => {
  it("finds the first slot whose right edge reaches x", () => {
    const list = Array.from({ length: 100 }, (_, i) =>
      media(`m${i}`, { takenAt: new Date(Date.UTC(2026, 9, 14, 10, 0, i)).toISOString() }),
    );
    const l = build(list);
    const target = l.byId.get("m50")!;
    const i = firstVisible(l.slots, target.x + 1);
    expect(l.slots[i]).toBe(target);
    expect(firstVisible(l.slots, -100)).toBe(0);
    expect(firstVisible(l.slots, l.width + 100)).toBe(l.slots.length);
  });
});
