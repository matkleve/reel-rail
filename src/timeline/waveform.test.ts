import { media } from "@/test-utils";
import type { Media } from "@/types";

import { MAX_PAUSE_H, NEUTRAL, NIGHT_H, buildWave, maxZoom, nearest, waveLayers, windowAt } from "./waveform";

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

describe("waveLayers", () => {
  const list = [
    media("a", { takenAt: "2026-10-14T08:00:00", rating: 2, tags: ["Food"] }),
    media("b", { takenAt: "2026-10-14T08:01:00", rating: 2, tags: ["Food"] }),
    media("c", { takenAt: "2026-10-14T08:02:00", rating: -2 }),
    media("d", { takenAt: "2026-10-14T12:00:00", rating: 0, tags: ["Sunset", "Food"] }),
  ];

  it("makes one wave per tag plus a neutral one, neutral drawn first", () => {
    const { wave, map } = model(list);
    const w = waveLayers(wave, map, { start: 0, span: wave.total }, 40);
    expect(w.layers.map((l) => l.tag)).toEqual([NEUTRAL, "Food", "Sunset"]);
    expect(w.layers.find((l) => l.tag === "Food")!.total).toBe(3);
  });

  it("floats a wave above the middle where its media are good, below where they are bad", () => {
    const { wave, map } = model(list);
    const w = waveLayers(wave, map, { start: 0, span: wave.total }, 40);
    const food = w.layers.find((l) => l.tag === "Food")!;
    const neutral = w.layers.find((l) => l.tag === NEUTRAL)!;
    expect(food.mean[0]).toBeCloseTo(2);
    expect(neutral.mean[0]).toBeCloseTo(-2);
    expect(w.spine[0]).toBeGreaterThan(0);
  });

  it("puts one dot per medium at its relative time", () => {
    const { wave, map } = model(list);
    const w = waveLayers(wave, map, { start: 0, span: wave.total }, 40);
    expect(w.dots.map((d) => d.rating)).toEqual([2, 2, -2, 0]);
    expect(w.dots[3]!.at).toBe(1);
  });

  it("folds tags beyond the colour budget into the neutral wave", () => {
    const { wave, map } = model(list);
    const w = waveLayers(wave, map, { start: 0, span: wave.total }, 40, 1);
    expect(w.layers.map((l) => l.tag)).toEqual([NEUTRAL, "Food"]);
    expect(w.dots.every((d) => d.tag === NEUTRAL || d.tag === "Food")).toBe(true);
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
