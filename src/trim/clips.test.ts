import { describe, expect, it } from "vitest";

import { NEW_CLIP_S, clipAt, clipFileName, clipIndexAt, clipRating, gaps, inOrder, keptSeconds } from "./clips";

describe("clips", () => {
  it("starts a new clip at the playhead, NEW_CLIP_S long", () => {
    expect(clipAt(10, 60)).toEqual({ start: 10, end: 10 + NEW_CLIP_S });
  });

  it("pulls a clip near the end back so it keeps its length", () => {
    expect(clipAt(58, 60)).toEqual({ start: 60 - NEW_CLIP_S, end: 60 });
  });

  it("a video shorter than a clip gets one clip over all of it", () => {
    expect(clipAt(1, 3)).toEqual({ start: 0, end: 3 });
  });

  it("orders by start, numbers files in that order", () => {
    expect(inOrder([{ start: 9, end: 12 }, { start: 2, end: 4 }])).toEqual([
      { start: 2, end: 4 },
      { start: 9, end: 12 },
    ]);
    expect(clipFileName("IMG_1234.MOV", 2, 3)).toBe("IMG_1234-clip2.MOV");
    expect(clipFileName("IMG_1234.MOV", 1, 1)).toBe("IMG_1234-trimmed.MOV");
  });

  it("finds the clip under a time, the later one where they overlap", () => {
    const clips = [{ start: 0, end: 5 }, { start: 4, end: 8 }];
    expect(clipIndexAt(clips, 2)).toBe(0);
    expect(clipIndexAt(clips, 4.5)).toBe(1);
    expect(clipIndexAt(clips, 9)).toBe(-1);
  });

  it("counts overlapping seconds once", () => {
    expect(keptSeconds([{ start: 0, end: 5 }, { start: 4, end: 8 }, { start: 10, end: 11 }])).toBe(9);
  });

  it("a clip of a video rated delete starts unrated; otherwise it inherits", () => {
    expect(clipRating(-2)).toBe(0);
    expect(clipRating(2)).toBe(2);
  });

  it("shades what no clip keeps", () => {
    expect(gaps([{ start: 4, end: 8 }, { start: 1, end: 5 }], 10)).toEqual([
      { start: 0, end: 1 },
      { start: 8, end: 10 },
    ]);
    expect(gaps([{ start: 0, end: 10 }], 10)).toEqual([]);
  });
});
