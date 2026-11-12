import { describe, expect, it } from "vitest";

import { media } from "@/test-utils";
import type { Media, Rating } from "@/types";

import { dayDate, dayKey, groupDays } from "./days";

const at = (id: string, d: number, h: number, rating: Rating = 0): Media =>
  media(id, { takenAt: new Date(2026, 9, d, h).toISOString(), rating });

describe("days", () => {
  it("keys a shot by its local calendar day", () => {
    expect(dayKey(new Date(2026, 9, 14, 23, 30).toISOString())).toBe("2026-10-14");
    expect(dayDate("2026-10-14").getDate()).toBe(14);
  });

  it("groups by day, best photo on top, counts per rating", () => {
    const list = [at("a", 14, 9), at("b", 14, 10, 2), at("c", 14, 11, 1), at("d", 14, 12, -2), at("e", 15, 8, -1)];
    const m = Object.fromEntries(list.map((x) => [x.id, x]));
    const days = groupDays(list.map((x) => x.id), m);
    expect(days.map((d) => d.key)).toEqual(["2026-10-14", "2026-10-15"]);
    expect(days[0]!.ids).toEqual(["a", "b", "c", "d"]);
    expect(days[0]!.top3).toEqual(["b", "c", "a"]); // the discard is never a cover
    expect(days[0]!.counts).toEqual({ top: 1, good: 1, bad: 0, unrated: 1 });
    expect(days[1]!.top3).toEqual(["e"]);
  });
});
