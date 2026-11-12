import { describe, expect, it } from "vitest";

import type { Media } from "@/types";

import { computeStacks } from "./stacks";

const at = (id: string, sec: number, type: Media["type"] = "photo"): Media =>
  ({ id, path: `${id}`, type, takenAt: new Date(sec * 1000).toISOString(), rating: 0, tags: [], exportedTo: [] }) as Media;

describe("computeStacks", () => {
  it("groups photos less than 3 s apart", () => {
    const media = { a: at("a", 0), b: at("b", 1), c: at("c", 10) };
    expect(computeStacks(["a", "b", "c"], media).members).toEqual({ a: ["a", "b"] });
  });

  it("never stacks videos — clips of one video are seconds apart but each its own moment", () => {
    const media = { v1: at("v1", 0, "video"), v2: at("v2", 2, "video"), p: at("p", 3), q: at("q", 4) };
    const { stackOf, members } = computeStacks(["v1", "v2", "p", "q"], media);
    expect(stackOf.v1).toBeUndefined();
    expect(stackOf.v2).toBeUndefined();
    expect(members).toEqual({ p: ["p", "q"] });
  });
});
