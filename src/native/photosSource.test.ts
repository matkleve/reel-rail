import type { PhotoAsset } from "./photoLibrary";
import { assetId, photoFiles, uniquePath } from "./photosSource";

const asset = (id: string, name: string, takenAt?: string, extra: Partial<PhotoAsset> = {}): PhotoAsset => ({
  id,
  name,
  takenAt,
  type: "photo",
  duration: 0,
  width: 4032,
  height: 3024,
  ...extra,
});

describe("the Photos library as a source", () => {
  it("lists without reading a single file", () => {
    const read = vi.fn();
    const files = photoFiles([asset("A/L0/001", "IMG_1.HEIC", "2026-10-14T10:00:00Z")], read);
    expect(files).toHaveLength(1);
    expect(read).not.toHaveBeenCalled();
    expect(files[0]!.known).toEqual({
      id: "ph-A_L0_001",
      size: 0,
      mtime: Date.parse("2026-10-14T10:00:00Z"),
      meta: { takenAt: "2026-10-14T10:00:00Z" },
    });
  });

  it("keeps the place and the media type", () => {
    const [f] = photoFiles([asset("v", "IMG_2.MOV", "2026-10-14T10:00:00Z", { type: "video", gps: { lat: 44.1, lng: 9.7 } })], vi.fn());
    expect(f!.type).toBe("video");
    expect(f!.known!.meta.gps).toEqual({ lat: 44.1, lng: 9.7 });
  });

  it("gives repeated names their own path, oldest keeps the plain one", () => {
    const files = photoFiles(
      [asset("new", "IMG_0001.HEIC", "2026-10-14T10:00:00Z"), asset("old", "IMG_0001.HEIC", "2016-01-01T10:00:00Z")],
      vi.fn(),
    );
    expect(files.map((f) => [f.known!.id, f.path])).toEqual([
      ["ph-old", "IMG_0001.HEIC"],
      ["ph-new", "IMG_0001 (2).HEIC"],
    ]);
  });

  it("ids are stable and safe as keys", () => {
    expect(assetId({ id: "6F1D-22/L0/001" })).toBe("ph-6F1D-22_L0_001");
    expect(uniquePath("clip.mp4", new Set(["clip.mp4", "clip (2).mp4"]))).toBe("clip (3).mp4");
  });
});
