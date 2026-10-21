import { media } from "@/test-utils";
import { emptyReel, type ReelFile } from "@/types";

import { daysLeft, deletePaths, dueNow, withoutMedia } from "./deletion";
import { normalize } from "./reelFile";

const NOW = new Date("2026-10-21T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 864e5).toISOString();

function reelOf(...list: ReturnType<typeof media>[]): ReelFile {
  return { ...emptyReel(), media: Object.fromEntries(list.map((m) => [m.id, m])) };
}

describe("30-day deletion", () => {
  it("counts down from the moment of discarding", () => {
    expect(daysLeft(media("a", { rating: -2, discardedAt: daysAgo(0) }), NOW)).toBe(30);
    expect(daysLeft(media("a", { rating: -2, discardedAt: daysAgo(29.5) }), NOW)).toBe(1);
    expect(daysLeft(media("a", { rating: -2, discardedAt: daysAgo(40) }), NOW)).toBe(0);
    expect(daysLeft(media("a", { rating: -1, discardedAt: daysAgo(40) }), NOW)).toBeUndefined();
  });

  it("is due only for discards past 30 days that are on disk", () => {
    const reel = reelOf(
      media("old", { rating: -2, discardedAt: daysAgo(31) }),
      media("fresh", { rating: -2, discardedAt: daysAgo(3) }),
      media("kept", { rating: 0 }),
      media("unplugged", { rating: -2, discardedAt: daysAgo(90), missing: true }),
    );
    expect(dueNow(reel, NOW).media.map((m) => m.id)).toEqual(["old"]);
  });

  it("includes expired bin entries", () => {
    const reel = {
      ...emptyReel(),
      bin: [
        { path: "_reel_trash/a.mov", deleteAfter: daysAgo(1), was: "a.mov" },
        { path: "_reel_trash/b.mov", deleteAfter: daysAgo(-5), was: "b.mov" },
      ],
    };
    expect(dueNow(reel, NOW).bin.map((b) => b.was)).toEqual(["a.mov"]);
  });

  it("drops deleted media from the reel and from every series", () => {
    const reel = {
      ...reelOf(media("a"), media("b")),
      series: [{ id: "s", title: "S", mediaIds: ["a", "b"], createdAt: "" }],
    };
    const next = withoutMedia(reel, ["a"]);
    expect(Object.keys(next.media)).toEqual(["b"]);
    expect(next.series[0]!.mediaIds).toEqual(["b"]);
  });

  it("gives discards from before the rule their full 30 days", () => {
    const reel = normalize({ version: 2, media: { a: media("a", { rating: -2 }) } }, NOW);
    expect(daysLeft(reel.media.a!, NOW)).toBe(30);
  });
});

describe("deletePaths", () => {
  // A minimal in-memory folder: enough of FileSystemDirectoryHandle for removeEntry.
  function folder(tree: Record<string, unknown>): FileSystemDirectoryHandle {
    return {
      async getDirectoryHandle(name: string) {
        const sub = tree[name];
        if (!sub || typeof sub !== "object") throw new DOMException("no dir", "NotFoundError");
        return folder(sub as Record<string, unknown>);
      },
      async removeEntry(name: string) {
        if (!(name in tree)) throw new DOMException("no file", "NotFoundError");
        if (tree[name] === "locked") throw new DOMException("busy", "NoModificationAllowedError");
        delete tree[name];
      },
    } as unknown as FileSystemDirectoryHandle;
  }

  it("deletes, treats already-gone as deleted, and reports the rest", async () => {
    const tree = { trip: { "a.jpg": "x", "b.jpg": "locked" } };
    const r = await deletePaths(folder(tree), ["trip/a.jpg", "trip/b.jpg", "trip/gone.jpg"]);
    expect(r.deleted).toEqual(["trip/a.jpg", "trip/gone.jpg"]);
    expect(r.failed).toEqual(["trip/b.jpg"]);
    expect(tree.trip).toEqual({ "b.jpg": "locked" });
  });
});
