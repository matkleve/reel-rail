import { FolderSource } from "@/fs/folderSource";
import { memoryFolder } from "@/fs/memoryFolder";
import { setSource } from "@/fs/session";
import { media } from "@/test-utils";
import { emptyReel, type Media, type Workflow } from "@/types";

import { purgeDue, restore, sweep } from "./discards";
import { useReel } from "./useReel";

const LONG_AGO = new Date(Date.now() - 60_000).toISOString();

/** A folder with a.jpg (a discard whose countdown ran out) and b.jpg. */
function setup(workflow: Workflow = "edit", beforeMove?: () => void) {
  const folder = memoryFolder({ "trip/a.jpg": "A", "trip/b.jpg": "B" }, { beforeMove });
  const source = new FolderSource(folder.root);
  setSource(source);
  const a = media("a", { path: "trip/a.jpg", rating: -2, discardedAt: LONG_AGO, size: 1, mtime: 1 });
  const b = media("b", { path: "trip/b.jpg", size: 1, mtime: 1 });
  useReel.getState().load({ ...emptyReel(), workflow, media: { a, b } });
  return { folder, source };
}
const rec = (id: string): Media => useReel.getState().reel.media[id]!;

describe("the sweep", () => {
  it("moves a discard whose countdown ran out into _reel_trash/ and off the rail", async () => {
    const { folder } = setup();
    await sweep();
    expect(folder.paths()).toEqual(["_reel_trash/trip/a.jpg", "trip/b.jpg"]);
    expect(rec("a").binned).toMatchObject({ path: "_reel_trash/trip/a.jpg", from: "trip/a.jpg" });
    expect(useReel.getState().order).toEqual(["b"]);
  });

  it("puts the file back when the user keeps it while it moves", async () => {
    const { folder } = setup("edit", () => useReel.getState().setRatings([{ id: "a", rating: 0 }]));
    await sweep();
    expect(folder.paths()).toEqual(["trip/a.jpg", "trip/b.jpg"]);
    expect(rec("a").binned).toBeUndefined();
    expect(rec("a").rating).toBe(0);
  });

  it("puts the file back when another folder is opened while it moves", async () => {
    const other = memoryFolder({ "trip/a.jpg": "OTHER" });
    const { folder } = setup("edit", () => setSource(new FolderSource(other.root)));
    await sweep();
    expect(folder.paths()).toEqual(["trip/a.jpg", "trip/b.jpg"]);
    expect(other.paths()).toEqual(["trip/a.jpg"]);
  });

  it("only hides when the folder is left as it is", async () => {
    const { folder } = setup("export");
    await sweep();
    expect(folder.paths()).toEqual(["trip/a.jpg", "trip/b.jpg"]);
    expect(rec("a").binned?.path).toBeUndefined();
    expect(useReel.getState().order).toEqual(["b"]);
  });

  it("does nothing before the folder's workflow is chosen", async () => {
    const { folder } = setup();
    useReel.setState((s) => ({ reel: { ...s.reel, workflow: undefined } }));
    await sweep();
    expect(folder.paths()).toEqual(["trip/a.jpg", "trip/b.jpg"]);
  });
});

describe("Recently deleted", () => {
  it("brings a file back to where it was taken from", async () => {
    const { folder } = setup();
    await sweep();
    await restore("a");
    expect(folder.paths()).toEqual(["trip/a.jpg", "trip/b.jpg"]);
    expect(rec("a")).toMatchObject({ rating: 0, path: "trip/a.jpg" });
    expect(rec("a").binned).toBeUndefined();
  });

  it("deletes for good after 30 days — but keeps a record whose file was moved back by hand", async () => {
    const { folder } = setup();
    await sweep();
    const past = new Date(Date.now() - 1000).toISOString();
    // b: pretend it was binned too, then dragged back into the library by hand (trash path gone, found by the scan).
    useReel.getState().patch(["a"], (m) => ({ ...m, binned: { ...m.binned!, until: past } }));
    useReel.getState().patch(["b"], (m) => ({ ...m, binned: { path: "_reel_trash/trip/b.jpg", until: past } }));
    await purgeDue();
    expect(folder.paths()).toEqual(["trip/b.jpg"]);
    expect(useReel.getState().reel.media.a).toBeUndefined();
    expect(rec("b").binned).toBeUndefined();
  });
});
