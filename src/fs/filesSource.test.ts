import { FilesSource, pathFor, typeOfFile } from "./filesSource";

const f = (name: string, size = 10, lastModified = 1, type = "image/jpeg", webkitRelativePath = "") =>
  ({ name, size, lastModified, type, webkitRelativePath }) as unknown as File;

describe("pathFor", () => {
  it("uses the name, or the folder path when the browser gives one", () => {
    expect(pathFor(f("a.jpg"), new Map())).toBe("a.jpg");
    expect(pathFor(f("a.jpg", 1, 1, "image/jpeg", "Trip/Porto/a.jpg"), new Map())).toBe("Trip/Porto/a.jpg");
  });

  it("gives a different file with a taken name a numbered name (iOS: many image.jpg)", () => {
    const taken = new Map([["image.jpg", { size: 10, lastModified: 1 }]]);
    expect(pathFor(f("image.jpg", 20, 2), taken)).toBe("image (2).jpg");
  });

  it("keeps the first path for the same file picked twice", () => {
    const taken = new Map([["image.jpg", { size: 10, lastModified: 1 }]]);
    expect(pathFor(f("image.jpg", 10, 1), taken)).toBe("image.jpg");
  });
});

describe("typeOfFile", () => {
  it("trusts the MIME type first, then the extension", () => {
    expect(typeOfFile(f("x", 1, 1, "image/heic"))).toBe("photo");
    expect(typeOfFile(f("clip.MOV", 1, 1, ""))).toBe("video");
    expect(typeOfFile(f("notes.txt", 1, 1, "text/plain"))).toBeUndefined();
  });
});

describe("FilesSource", () => {
  it("adds media only, dedupes re-adds, and lists lazily", async () => {
    const src = new FilesSource();
    expect(src.add([f("a.jpg"), f("b.mov", 5, 1, "video/quicktime"), f("c.txt", 1, 1, "text/plain")])).toBe(2);
    expect(src.add([f("a.jpg")])).toBe(0);
    const list = await src.list();
    expect(list.map((x) => [x.path, x.type])).toEqual([
      ["a.jpg", "photo"],
      ["b.mov", "video"],
    ]);
    await expect(src.getFile("nope.jpg")).rejects.toThrow(/add it again/);
  });
});
