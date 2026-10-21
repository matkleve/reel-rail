// @vitest-environment node
import { readFileSync } from "node:fs";

import { ALL_FORMATS, BlobSource, Input } from "mediabunny";

import { patchCreationTime, trimToBlob, trimToWritable, trimmedTakenAt } from "./trimVideo";
import { videoCreationTime } from "./videoMeta";

// 4 s, 160×90 H.264 + AAC, key frame every second, created 2026-10-14 09:30 UTC.
const clip = () =>
  new File([readFileSync(new URL("./__fixtures__/clip.mov", import.meta.url))], "clip.mov", {
    type: "video/quicktime",
  });

async function durationOf(blob: Blob): Promise<number> {
  return new Input({ source: new BlobSource(blob), formats: ALL_FORMATS }).computeDuration();
}

describe("trimVideo", () => {
  it("cuts without re-encoding and keeps the taken-at time (+ the cut start)", async () => {
    const file = clip();
    const when = await trimmedTakenAt(file, "2000-01-01T00:00:00Z", 1.5);
    expect(when.toISOString()).toBe("2026-10-14T09:30:01.000Z");

    const out = await trimToBlob(file, { start: 1.5, end: 3 }, when);
    const d = await durationOf(out);
    // Starts at the key frame at 1.0 s at the latest; never loses the requested range.
    expect(d).toBeGreaterThanOrEqual(1.5 - 0.05);
    expect(d).toBeLessThanOrEqual(2.1);
    expect(out.size).toBeLessThan(file.size);
    expect(videoCreationTime(await out.arrayBuffer())?.toISOString()).toBe("2026-10-14T09:30:01.000Z");
  });

  it("streams into a writable at the given positions and closes it", async () => {
    const file = clip();
    const parts: { data: Uint8Array; position: number }[] = [];
    let closed = false;
    const sink = {
      write: async (c: { data: Uint8Array; position: number }) =>
        void parts.push({ data: c.data.slice(), position: c.position }),
      close: async () => void (closed = true),
      abort: async () => {},
    } as unknown as FileSystemWritableFileStream;
    await trimToWritable(file, { start: 0, end: 2 }, new Date("2026-10-14T09:30:00Z"), sink);
    expect(closed).toBe(true);

    const size = Math.max(...parts.map((p) => p.position + p.data.length));
    const bytes = new Uint8Array(size);
    for (const p of parts) bytes.set(p.data, p.position);
    expect(await durationOf(new Blob([bytes]))).toBeCloseTo(2, 0);
    expect(videoCreationTime(bytes.buffer)?.toISOString()).toBe("2026-10-14T09:30:00.000Z");
  });

  it("patches only a real mvhd box", () => {
    const junk = new TextEncoder().encode("....mvhd but not a box");
    expect(patchCreationTime(junk, new Date())).toBe(false);
  });
});
