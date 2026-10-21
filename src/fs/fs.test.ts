import { emptyReel } from "@/types";
import { media } from "@/test-utils";

import { exportName, folderName } from "./exportSeries";
import { hashFile } from "./hash";
import { normalize } from "./reelFile";
import { reconcile, type Scanned } from "./reconcile";
import { videoCreationTime, videoGps } from "./videoMeta";
import { mediaTypeOf } from "./walk";

const scanned = (id: string, path: string, extra: Partial<Scanned> = {}): Scanned => ({
  id,
  path,
  type: "photo",
  size: 100,
  mtime: Date.parse("2026-10-14T10:00:00Z"),
  ...extra,
});

describe("hashFile", () => {
  it("is stable for equal content and differs when size differs", async () => {
    const a = await hashFile(new Blob(["hello world"]));
    const b = await hashFile(new Blob(["hello world"]));
    const c = await hashFile(new Blob(["hello world!"]));
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
    expect(a.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores the middle of large files (head + tail + size only)", async () => {
    const MB = 1024 * 1024;
    const make = (mid: number) => {
      const bytes = new Uint8Array(3 * MB);
      bytes[Math.floor(1.5 * MB)] = mid;
      return new Blob([bytes]);
    };
    expect((await hashFile(make(1))).id).toBe((await hashFile(make(2))).id);
  });
});

describe("reconcile", () => {
  it("adds new files at rating 0 with metadata", () => {
    const next = reconcile(emptyReel(), [
      scanned("a", "x/a.jpg", { meta: { takenAt: "2026-01-01T00:00:00.000Z", gps: { lat: 1, lng: 2 } } }),
    ]);
    expect(next.media.a).toMatchObject({ rating: 0, takenAt: "2026-01-01T00:00:00.000Z", gps: { lat: 1, lng: 2 } });
  });

  it("keeps ratings across a rename (same hash, new path)", () => {
    const prev = { ...emptyReel(), media: { a: media("a", { rating: 2, tags: ["Food"], path: "old.jpg" }) } };
    const next = reconcile(prev, [scanned("a", "new.jpg")]);
    expect(next.media.a).toMatchObject({ rating: 2, tags: ["Food"], path: "new.jpg" });
  });

  it("marks vanished files as missing instead of deleting them", () => {
    const prev = { ...emptyReel(), media: { a: media("a", { rating: 1 }) } };
    const next = reconcile(prev, []);
    expect(next.media.a).toMatchObject({ rating: 1, missing: true });
  });

  it("un-marks a file that came back", () => {
    const prev = { ...emptyReel(), media: { a: media("a", { missing: true }) } };
    expect(reconcile(prev, [scanned("a", "trip/a.jpg")]).media.a!.missing).toBeUndefined();
  });

  it("collapses duplicates into one Media with altPaths", () => {
    const next = reconcile(emptyReel(), [scanned("a", "b/copy.jpg"), scanned("a", "a/orig.jpg")]);
    expect(Object.keys(next.media)).toEqual(["a"]);
    expect(next.media.a).toMatchObject({ path: "a/orig.jpg", altPaths: ["b/copy.jpg"] });
  });

  it("keeps series and presets", () => {
    const prev = { ...emptyReel(), series: [{ id: "s", title: "T", mediaIds: [], createdAt: "" }] };
    expect(reconcile(prev, []).series).toEqual(prev.series);
  });
});

describe("normalize", () => {
  it("fills in missing collections and defaults", () => {
    const r = normalize({ version: 1, media: { a: { id: "a", path: "a.jpg", type: "photo", takenAt: "" } } });
    expect(r.series).toEqual([]);
    expect(r.tagPresets).toHaveLength(9);
    expect(r.media.a).toMatchObject({ tags: [], exportedTo: [], rating: 0 });
  });

  it("refuses an unknown version rather than guessing", () => {
    expect(() => normalize({ version: 3 })).toThrow(/version 3/);
  });

  it("migrates v1: its 'unusable' (−1) becomes 'discard' (−2), the rest stays", () => {
    const r = normalize({
      version: 1,
      media: {
        a: { id: "a", path: "a.jpg", type: "photo", takenAt: "", rating: -1 },
        b: { id: "b", path: "b.jpg", type: "photo", takenAt: "", rating: 1 },
      },
    });
    expect(r.version).toBe(2);
    expect(r.media.a!.rating).toBe(-2);
    expect(r.media.b!.rating).toBe(1);
  });

  it("keeps v2's 'not great' (−1) as it is", () => {
    const r = normalize({ version: 2, media: { a: { id: "a", path: "a.jpg", type: "photo", takenAt: "", rating: -1 } } });
    expect(r.media.a!.rating).toBe(-1);
  });
});

describe("mediaTypeOf", () => {
  it.each([
    ["IMG_1.JPG", "photo"],
    ["a.heic", "photo"],
    ["clip.MOV", "video"],
    ["clip.mp4", "video"],
    ["notes.txt", undefined],
  ])("%s → %s", (name, type) => expect(mediaTypeOf(name)).toBe(type));
});

describe("video metadata", () => {
  function mvhd(date: Date, extra = ""): ArrayBuffer {
    const enc = new TextEncoder();
    const pre = enc.encode("....moov....mvhd");
    const buf = new Uint8Array(pre.length + 8 + 64);
    buf.set(pre);
    const view = new DataView(buf.buffer);
    // version 0, flags 0, then creation_time (seconds since 1904)
    view.setUint32(pre.length + 4, date.getTime() / 1000 + 2082844800);
    const tail = enc.encode(extra);
    const out = new Uint8Array(buf.length + tail.length);
    out.set(buf);
    out.set(tail, buf.length);
    return out.buffer;
  }

  it("reads mvhd creation time", () => {
    const d = new Date("2026-10-14T08:30:00Z");
    expect(videoCreationTime(mvhd(d))?.toISOString()).toBe(d.toISOString());
  });

  it("ignores the 1904 'clock never set' value", () => {
    expect(videoCreationTime(mvhd(new Date(Date.UTC(1904, 0, 1))))).toBeUndefined();
  });

  it("reads Apple ©xyz GPS", () => {
    const bytes = new Uint8Array([0xa9, 0x78, 0x79, 0x7a, ...new TextEncoder().encode("\u0000\u0011+41.1496-008.6110+085.000/")]);
    expect(videoGps(bytes.buffer)).toEqual({ lat: 41.1496, lng: -8.611 });
  });
});

describe("export naming", () => {
  it("prefixes in order, padded to the series length", () => {
    expect(exportName(0, 9, "trip/IMG_1.jpg")).toBe("01_IMG_1.jpg");
    expect(exportName(99, 120, "IMG_2.mov")).toBe("100_IMG_2.mov");
    expect(exportName(4, 120, "a/b/c.jpg")).toBe("005_c.jpg");
  });

  it("makes titles folder-safe without losing umlauts or dashes", () => {
    expect(folderName("Porto – Tram & Tauben / Okt: 26")).toBe("Porto – Tram & Tauben Okt 26");
    expect(folderName("...")).toBe("Series");
    expect(folderName("Grüße")).toBe("Grüße");
  });
});
