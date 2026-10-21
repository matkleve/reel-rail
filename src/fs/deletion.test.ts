import { media } from "@/test-utils";
import { emptyReel, type Media, type ReelFile } from "@/types";

import { binUntil, daysLeft, deletePath, dueForDeletion, dueToLeave, secondsLeft, withoutMedia } from "./deletion";
import { normalize } from "./reelFile";

const NOW = new Date("2026-10-21T12:00:00Z").getTime();
const secsAgo = (n: number) => new Date(NOW - n * 1000).toISOString();
const daysFromNow = (n: number) => new Date(NOW + n * 864e5).toISOString();

function reelOf(...list: Media[]): ReelFile {
  return { ...emptyReel(), media: Object.fromEntries(list.map((m) => [m.id, m])) };
}

describe("the countdown", () => {
  it("runs 30 s from the moment of discarding", () => {
    expect(secondsLeft(media("a", { rating: -2, discardedAt: secsAgo(0) }), NOW)).toBe(30);
    expect(secondsLeft(media("a", { rating: -2, discardedAt: secsAgo(12) }), NOW)).toBe(18);
    expect(secondsLeft(media("a", { rating: -2, discardedAt: secsAgo(99) }), NOW)).toBe(0);
    expect(secondsLeft(media("a", { rating: -1, discardedAt: secsAgo(5) }), NOW)).toBe(0);
  });

  it("sends off only discards whose time is up and that are still on the rail", () => {
    const reel = reelOf(
      media("due", { rating: -2, discardedAt: secsAgo(31) }),
      media("counting", { rating: -2, discardedAt: secsAgo(3) }),
      media("kept", { rating: 0 }),
      media("unplugged", { rating: -2, discardedAt: secsAgo(90), missing: true }),
      media("gone", { rating: -2, discardedAt: secsAgo(90), binned: { until: daysFromNow(5) } }),
    );
    expect(dueToLeave(reel, NOW).map((m) => m.id)).toEqual(["due"]);
  });

  it("gives discards from before the countdown a full one", () => {
    const reel = normalize({ version: 2, media: { a: media("a", { rating: -2 }) } }, new Date(NOW));
    expect(secondsLeft(reel.media.a!, NOW)).toBe(30);
  });
});

describe("Recently deleted", () => {
  it("keeps files 30 days", () => {
    const m = media("a", { binned: { path: "_reel_trash/a.jpg", until: binUntil(NOW) } });
    expect(daysLeft(m, NOW)).toBe(30);
  });

  it("deletes for good only what reel-rail parked, once its time is up", () => {
    const reel = reelOf(
      media("expired", { binned: { path: "_reel_trash/a.jpg", until: daysFromNow(-1) } }),
      media("waiting", { binned: { path: "_reel_trash/b.jpg", until: daysFromNow(4) } }),
      // Hidden only (files mode / folder left as it is): there is no file of ours to delete.
      media("hidden", { binned: { until: daysFromNow(-9) } }),
      // An old discard that never left the folder is never deleted.
      media("old", { rating: -2, discardedAt: secsAgo(90 * 86400) }),
    );
    expect(dueForDeletion(reel, NOW).map((m) => m.id)).toEqual(["expired"]);
  });

  it("drops deleted media from the reel and from every series", () => {
    const reel = { ...reelOf(media("a"), media("b")), series: [{ id: "s", title: "S", mediaIds: ["a", "b"], createdAt: "" }] };
    const next = withoutMedia(reel, ["a"]);
    expect(Object.keys(next.media)).toEqual(["b"]);
    expect(next.series[0]!.mediaIds).toEqual(["b"]);
  });
});

describe("deletePath", () => {
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

  it("deletes, treats already-gone as done, and reports anything else", async () => {
    const tree = { _reel_trash: { "a.jpg": "x", "b.jpg": "locked" } };
    await deletePath(folder(tree), "_reel_trash/a.jpg");
    await deletePath(folder(tree), "_reel_trash/gone.jpg");
    await expect(deletePath(folder(tree), "_reel_trash/b.jpg")).rejects.toThrow();
    expect(tree._reel_trash).toEqual({ "b.jpg": "locked" });
  });
});
