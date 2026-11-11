import { media } from "@/test-utils";
import type { Media } from "@/types";

import { MAX_PAUSE_H, MIN_SCALE, NIGHT_H, barBins, buildAxis, levelOf, maxZoom, nearest, windowAt } from "./timeModel";

function model(list: Media[]) {
  const map = Object.fromEntries(list.map((m) => [m.id, m]));
  return { axis: buildAxis(list.map((m) => m.id), map), map };
}

describe("buildAxis", () => {
  it("caps pauses within a day and counts nights as a fixed gap", () => {
    const { axis } = model([
      media("a", { takenAt: "2026-10-14T08:00:00" }),
      media("b", { takenAt: "2026-10-14T09:00:00" }),
      media("c", { takenAt: "2026-10-14T19:00:00" }),
      media("d", { takenAt: "2026-10-15T07:00:00" }),
    ]);
    expect(axis.pos).toEqual([0, 1, 1 + MAX_PAUSE_H, 1 + MAX_PAUSE_H + NIGHT_H]);
    expect(axis.days.map((d) => d.pos)).toEqual([0, 1 + MAX_PAUSE_H + NIGHT_H]);
  });
});

describe("windowAt", () => {
  const { axis } = model(
    Array.from({ length: 11 }, (_, i) => media(`m${i}`, { takenAt: `2026-10-14T${String(8 + i).padStart(2, "0")}:00:00` })),
  );

  it("shows the whole trip at zoom 1", () => {
    expect(windowAt(axis, 1, 5)).toEqual({ start: 0, span: 10 });
  });

  it("centres on the focus and clamps at the ends", () => {
    expect(windowAt(axis, 5, 5)).toEqual({ start: 4, span: 2 });
    expect(windowAt(axis, 5, 0.2)).toEqual({ start: 0, span: 2 });
    expect(windowAt(axis, 5, 9.9)).toEqual({ start: 8, span: 2 });
  });

  it("never zooms below half an hour", () => {
    expect(maxZoom(axis)).toBe(20);
    expect(windowAt(axis, 1000, 5).span).toBe(0.5);
  });
});

describe("barBins", () => {
  const list = [
    media("t", { takenAt: "2026-10-14T08:00:00", rating: 2 }),
    media("g", { takenAt: "2026-10-14T08:10:00", rating: 1 }),
    media("b", { takenAt: "2026-10-14T08:20:00", rating: -1 }),
    media("u", { takenAt: "2026-10-14T10:00:00", rating: 0 }),
    media("x", { takenAt: "2026-10-14T10:05:00", rating: -2 }),
  ];
  const { axis, map } = model(list);

  it("stacks each bin by rating level", () => {
    const { bins } = barBins(axis, map, windowAt(axis, 1, 0), 2);
    expect(bins[0]).toEqual({ top: 1, good: 1, bad: 1, unrated: 0 });
    expect(bins[1]).toEqual({ top: 0, good: 0, bad: 0, unrated: 1 });
  });

  it("leaves discards out — they are on their way out", () => {
    const { bins, max } = barBins(axis, map, windowAt(axis, 1, 0), 1);
    expect(bins[0]).toEqual({ top: 1, good: 1, bad: 1, unrated: 1 });
    expect(max).toBe(MIN_SCALE); // 4 shots are scaled as a quiet stretch, not a full bar
    expect(levelOf({ rating: -2 })).toBeUndefined();
  });

  it("counts only what is inside the window", () => {
    const win = { start: 0, span: 0.25 };
    const { bins } = barBins(axis, map, win, 1);
    expect(bins[0]).toEqual({ top: 1, good: 1, bad: 0, unrated: 0 });
  });
});

describe("nearest", () => {
  it("finds the closest medium", () => {
    expect(nearest([0, 1, 4], 2.4)).toBe(1);
    expect(nearest([0, 1, 4], 2.6)).toBe(2);
    expect(nearest([0, 1, 4], -3)).toBe(0);
    expect(nearest([0, 1, 4], 99)).toBe(2);
  });
});
