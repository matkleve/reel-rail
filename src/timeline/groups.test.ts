import { describe, expect, it } from "vitest";

import { media } from "@/test-utils";
import type { Media, Rating } from "@/types";

import { TIME_GAP_MAX, TIME_GAP_MIN, groupMedia, timeGap } from "./groups";

const MIN = 60_000;
const shot = (id: string, at: Date, extra: Partial<Media> = {}, rating: Rating = 0) =>
  media(id, { takenAt: at.toISOString(), rating, ...extra });
const by = (list: Media[]) => [list.map((m) => m.id), Object.fromEntries(list.map((m) => [m.id, m]))] as const;

describe("groupMedia", () => {
  it("single: everything in one", () => {
    const [ids, m] = by([shot("a", new Date(2026, 9, 14, 9)), shot("b", new Date(2026, 9, 15, 9))]);
    expect(groupMedia("single", ids, m).map((g) => g.ids)).toEqual([["a", "b"]]);
  });

  it("day: one group per calendar day, best on top", () => {
    const [ids, m] = by([shot("a", new Date(2026, 9, 14, 9)), shot("b", new Date(2026, 9, 14, 20), {}, 2), shot("c", new Date(2026, 9, 15, 9))]);
    const g = groupMedia("day", ids, m);
    expect(g.map((x) => x.ids)).toEqual([["a", "b"], ["c"]]);
    expect(g[0]!.top3).toEqual(["b", "a"]);
    expect(g[0]!.counts).toEqual({ top: 1, good: 0, bad: 0, unrated: 1 });
  });

  it("time: splits at the gaps that stand out — the morning, lunch, the evening", () => {
    const t0 = new Date(2026, 9, 14, 9).getTime();
    const at = (min: number) => new Date(t0 + min * MIN);
    const list = [0, 1, 2, 4, 5, 7, 150, 151, 153, 154, 480, 481, 483].map((min, i) => shot(`s${i}`, at(min)));
    const [ids, m] = by(list);
    expect(groupMedia("time", ids, m).map((g) => g.ids.length)).toEqual([6, 4, 3]);
  });

  it("the time gap stays between 30 minutes and 6 hours", () => {
    expect(timeGap([0, 1000, 2000, 3000])).toBe(TIME_GAP_MIN);
    expect(timeGap([0, 24 * 60 * MIN, 48 * 60 * MIN, 49 * 60 * MIN])).toBeLessThanOrEqual(TIME_GAP_MAX);
  });

  it("place: names first, GPS nearby joins — even later in the day — and the rest goes last", () => {
    const hotel = { lat: 41.15, lng: -8.61 };
    const beach = { lat: 41.2, lng: -8.7 };
    const [ids, m] = by([
      shot("a", new Date(2026, 9, 14, 8), { gps: hotel }),
      shot("b", new Date(2026, 9, 14, 12), { gps: beach }),
      shot("c", new Date(2026, 9, 14, 13), { place: "Porto" }),
      shot("d", new Date(2026, 9, 14, 21), { gps: { lat: 41.1505, lng: -8.6105 } }),
      shot("e", new Date(2026, 9, 14, 22)),
    ]);
    const g = groupMedia("place", ids, m);
    expect(g.map((x) => x.ids)).toEqual([["a", "d"], ["b"], ["c"], ["e"]]);
    expect(g[0]!.spot).toBe(1);
    expect(g[2]!.place).toBe("Porto");
    expect(g[3]!.noPlace).toBe(true);
  });
});
