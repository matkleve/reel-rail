import { media } from "@/test-utils";
import type { Media } from "@/types";

import { MAX_PAUSE_H, NIGHT_H, binWave, buildWave, maxZoom, nearest, windowAt } from "./waveform";

function model(list: Media[]) {
  const map = Object.fromEntries(list.map((m) => [m.id, m]));
  return { wave: buildWave(list.map((m) => m.id), map), map };
}

describe("buildWave", () => {
  it("caps pauses within a day and counts nights as a fixed gap", () => {
    const { wave } = model([
      media("a", { takenAt: "2026-10-14T08:00:00" }),
      media("b", { takenAt: "2026-10-14T09:00:00" }),
      media("c", { takenAt: "2026-10-14T19:00:00" }),
      media("d", { takenAt: "2026-10-15T07:00:00" }),
    ]);
    expect(wave.pos).toEqual([0, 1, 1 + MAX_PAUSE_H, 1 + MAX_PAUSE_H + NIGHT_H]);
    expect(wave.days.map((d) => d.pos)).toEqual([0, 1 + MAX_PAUSE_H + NIGHT_H]);
  });
});

describe("windowAt", () => {
  const { wave } = model(
    Array.from({ length: 11 }, (_, i) => media(`m${i}`, { takenAt: `2026-10-14T${String(8 + i).padStart(2, "0")}:00:00` })),
  );

  it("shows the whole trip at zoom 1", () => {
    expect(windowAt(wave, 1, 5)).toEqual({ start: 0, span: 10 });
  });

  it("centres on the focus and clamps at the ends", () => {
    expect(windowAt(wave, 5, 5)).toEqual({ start: 4, span: 2 });
    expect(windowAt(wave, 5, 0.2)).toEqual({ start: 0, span: 2 });
    expect(windowAt(wave, 5, 9.9)).toEqual({ start: 8, span: 2 });
  });

  it("never zooms below half an hour", () => {
    expect(maxZoom(wave)).toBe(20);
    expect(windowAt(wave, 1000, 5).span).toBe(0.5);
  });
});

describe("binWave", () => {
  it("counts media per bin and marks liked and top moments", () => {
    const { wave, map } = model([
      media("a", { takenAt: "2026-10-14T08:00:00", rating: 2 }),
      media("b", { takenAt: "2026-10-14T08:01:00", rating: 1 }),
      media("c", { takenAt: "2026-10-14T08:02:00" }),
      media("d", { takenAt: "2026-10-14T12:00:00" }),
    ]);
    const bins = binWave(wave, map, { start: 0, span: wave.total }, 4);
    expect(bins.count).toEqual([3, 0, 0, 1]);
    expect(bins.liked).toEqual([2, 0, 0, 0]);
    expect(bins.top).toEqual([true, false, false, false]);
    expect(bins.max).toBe(3);
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
