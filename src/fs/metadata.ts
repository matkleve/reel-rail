import exifr from "exifr";

import type { MediaType } from "@/types";

import { videoCreationTime, videoGps } from "./videoMeta";

export type Meta = { takenAt: string; gps?: { lat: number; lng: number } };

/**
 * Capture time + GPS. Photos: EXIF via exifr. Videos: the `mvhd`/`©xyz`
 * atoms from the bytes the hasher already read. Fallback: lastModified.
 */
export async function readMetadata(
  file: File,
  type: MediaType,
  head: ArrayBuffer,
  tail: ArrayBuffer,
): Promise<Meta> {
  const fallback = new Date(file.lastModified).toISOString();

  if (type === "video") {
    const date = videoCreationTime(head) ?? videoCreationTime(tail);
    const gps = videoGps(head) ?? videoGps(tail);
    return { takenAt: date?.toISOString() ?? fallback, ...(gps && { gps }) };
  }

  try {
    const data = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
      reviveValues: true,
    });
    const raw: unknown = data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate;
    const date = raw instanceof Date && !Number.isNaN(raw.getTime()) ? raw : undefined;
    const lat = data?.latitude;
    const lng = data?.longitude;
    const gps = typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined;
    return { takenAt: date?.toISOString() ?? fallback, ...(gps && { gps }) };
  } catch {
    // PNGs and screenshots often have no EXIF at all — not an error.
    return { takenAt: fallback };
  }
}
