import { media } from "@/test-utils";
import type { Media } from "@/types";

import { RATING_SCALE, floorFor, layoutCarousel } from "./layout";

const STAGE = { w: 1600, h: 600 };

function run(list: Media[], current = 0, aspect = 1.5) {
  const map = Object.fromEntries(list.map((m) => [m.id, m]));
  return layoutCarousel(
    list.map((m) => m.id),
    current,
    map,
    () => aspect,
    STAGE,
  );
}

const series = (n: number, patch: (i: number) => Partial<Media> = () => ({})) =>
  Array.from({ length: n }, (_, i) =>
    media(`m${i}`, { takenAt: new Date(Date.UTC(2026, 9, 14, 10, i)).toISOString(), ...patch(i) }),
  );

describe("layoutCarousel", () => {
  it("centres the current card", () => {
    const { cards } = run(series(5), 2);
    const c = cards.find((x) => x.d === 0)!;
    expect(c.id).toBe("m2");
    expect(c.x).toBe(STAGE.w / 2);
    expect(c.rotY).toBe(0);
  });

  it("puts neighbours directly side by side, without overlap, in time order", () => {
    const { cards } = run(series(9), 4);
    const sorted = [...cards].sort((a, b) => a.d - b.d);
    expect(sorted.map((c) => c.id)).toEqual(sorted.map((c) => `m${c.d + 4}`));
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]!.x - sorted[i]!.w / 2 - (sorted[i - 1]!.x + sorted[i - 1]!.w / 2);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(20);
    }
  });

  it("each of the five levels is bigger and higher than the one below", () => {
    const placed = ([-2, -1, 0, 1, 2] as const).map((r) => run([media("a", { rating: r })]).cards[0]!);
    for (let i = 1; i < placed.length; i++) {
      expect(placed[i]!.h).toBeGreaterThan(placed[i - 1]!.h);
      expect(placed[i]!.bottom).toBeLessThan(placed[i - 1]!.bottom);
    }
  });

  it("favorites are bigger and higher, discards smaller and lower", () => {
    const ratings = [-2, 0, 2] as const;
    const placed = ratings.map((r) => run([media("a", { rating: r })]).cards[0]!);
    const [unusable, neutral, top] = placed as [typeof placed[0], typeof placed[0], typeof placed[0]];
    expect(top.h / neutral.h).toBeCloseTo(RATING_SCALE[2] / RATING_SCALE[0]);
    expect(top.bottom).toBeLessThan(neutral.bottom);
    expect(unusable.h).toBeLessThan(neutral.h);
    expect(unusable.bottom).toBeGreaterThan(neutral.bottom);
  });

  it("shrinks cards with distance and turns them toward the centre", () => {
    const { cards } = run(series(7), 3);
    const at = (d: number) => cards.find((c) => c.d === d)!;
    expect(at(1).h).toBeLessThan(at(0).h);
    expect(at(3).h).toBeLessThan(at(1).h);
    expect(at(1).rotY).toBeLessThan(0);
    expect(at(-1).rotY).toBeGreaterThan(0);
  });

  it("only lays out what fits around the viewport", () => {
    const { cards } = run(series(500), 250);
    expect(cards.length).toBeLessThan(40);
  });

  it("inserts a day separator between days, on the later day", () => {
    const list = [
      media("a", { takenAt: "2026-10-14T20:00:00" }),
      media("b", { takenAt: "2026-10-15T08:00:00" }),
    ];
    const { seps, cards } = run(list, 0);
    expect(seps).toHaveLength(1);
    expect(seps[0]!.date.getDate()).toBe(15);
    const [a, b] = [cards.find((c) => c.id === "a")!, cards.find((c) => c.id === "b")!];
    expect(seps[0]!.x).toBeGreaterThan(a.x + a.w / 2);
    expect(seps[0]!.x).toBeLessThan(b.x - b.w / 2);
  });

  it("keeps a panorama in the centre narrower than the stage", () => {
    const { cards } = run([media("a", { rating: 2 })], 0, 2.2);
    expect(cards[0]!.w).toBeLessThanOrEqual(STAGE.w * 0.7 + 0.001);
  });
});

describe("portrait band", () => {
  // A phone in Safari: 393 wide, the date covers the top 70 px, the dock the bottom 80.
  const PHONE = { w: 393, h: 540, top: 70, bottom: 80 };
  const at = (rating: Media["rating"], aspect: number) =>
    layoutCarousel(["a"], 0, { a: media("a", { rating }) }, () => aspect, PHONE).cards[0]!;

  it("keeps every level between the date and the dock", () => {
    for (const r of [-2, -1, 0, 1, 2] as const) {
      const c = at(r, 9 / 16);
      expect(c.bottom - c.h).toBeGreaterThanOrEqual(PHONE.top);
      expect(c.bottom).toBeLessThanOrEqual(PHONE.h - PHONE.bottom + 0.001);
    }
  });

  it("gives a landscape photo most of the width", () => {
    expect(at(2, 4 / 3).w).toBeCloseTo(393 * 0.84);
  });

  it("puts the floor line where the cards stand", () => {
    expect(floorFor(PHONE) * PHONE.h).toBeCloseTo(at(0, 1).bottom);
  });

  it("ignores insets in landscape", () => {
    const a = layoutCarousel(["a"], 0, { a: media("a") }, () => 1.5, { w: 1600, h: 600, top: 90, bottom: 90 });
    expect(a.cards[0]!.bottom / 600).toBeCloseTo(0.8);
  });
});

describe("floor", () => {
  it("sits low in landscape, leaving room for the dock", () => {
    const land = layoutCarousel(["a"], 0, { a: media("a") }, () => 1.5, { w: 1600, h: 600 }).cards[0]!;
    expect(land.bottom / 600).toBeCloseTo(0.8);
    expect(floorFor({ w: 1600, h: 600 })).toBeCloseTo(0.8);
  });
});
