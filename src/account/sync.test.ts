import { media } from "@/test-utils";
import { emptyReel, type Media } from "@/types";

import { applyRemote, toPush } from "./sync";

const reelOf = (...list: Media[]) => ({ ...emptyReel(), media: Object.fromEntries(list.map((m) => [m.id, m])) });
const row = (id: string, rating: -2 | -1 | 0 | 1 | 2, at: string) => ({
  media_id: id,
  rating,
  tags: ["Food"],
  place: "Porto",
  updated_at: at,
});

describe("rating sync", () => {
  it("pushes only decisions changed since the last push", () => {
    const reel = reelOf(
      media("a", { changedAt: "2026-10-21T10:00:00Z" }),
      media("b", { changedAt: "2026-10-21T08:00:00Z" }),
      media("c"),
    );
    expect(toPush(reel, "2026-10-21T09:00:00Z").map((r) => r.media_id)).toEqual(["a"]);
    expect(toPush(reel, undefined).map((r) => r.media_id)).toEqual(["a", "b"]);
  });

  it("takes the newer side per item and ignores what is not here", () => {
    const reel = reelOf(
      media("old", { rating: 0, changedAt: "2026-10-21T08:00:00Z" }),
      media("new", { rating: 1, changedAt: "2026-10-21T12:00:00Z" }),
      media("never"),
    );
    const { reel: next, changed } = applyRemote(reel, [
      row("old", 2, "2026-10-21T10:00:00Z"),
      row("new", -1, "2026-10-21T10:00:00Z"),
      row("never", 1, "2026-10-21T10:00:00Z"),
      row("elsewhere", 1, "2026-10-21T10:00:00Z"),
    ]);
    expect(changed).toEqual(["old", "never"]);
    expect(next.media.old).toMatchObject({ rating: 2, tags: ["Food"], place: "Porto" });
    expect(next.media.new!.rating).toBe(1);
  });

  it("a discard from the other device counts down from when it was discarded there", () => {
    const { reel } = applyRemote(reelOf(media("a")), [row("a", -2, "2026-10-21T10:00:00Z")]);
    expect(reel.media.a!.discardedAt).toBe("2026-10-21T10:00:00Z");
  });
});
