/**
 * The shape of `.reel.json` — the single source of truth inside the opened
 * folder. Original media files are never written to; everything the user
 * decides lives here.
 *
 * Fields beyond the original contract are optional so that an older file
 * always still parses (see README § .reel.json).
 */

export type Rating = -1 | 0 | 1 | 2;
export type MediaType = "photo" | "video";

export type ExportRecord = { series: string; at: string };

export type Media = {
  /** SHA-256 over (first 1 MB + last 1 MB + size), hex. Stable across renames. */
  id: string;
  /** Relative path inside the opened folder, `/`-separated. */
  path: string;
  type: MediaType;
  /** ISO timestamp — EXIF / video header, fallback `file.lastModified`. */
  takenAt: string;
  gps?: { lat: number; lng: number };
  place?: string;
  rating: Rating;
  tags: string[];
  stackId?: string;
  /** Non-empty = already exported/posted. */
  exportedTo: ExportRecord[];
  /** File size in bytes. Lets a re-open skip hashing unchanged files. */
  size?: number;
  /** `file.lastModified` at last scan. Same purpose as `size`. */
  mtime?: number;
  /** Set when the file was not found on the last scan. Never deleted. */
  missing?: boolean;
  /** Other paths with byte-identical content (duplicates). */
  altPaths?: string[];
};

export type Series = {
  id: string;
  title: string;
  mediaIds: string[];
  createdAt: string;
  exportedPath?: string;
};

export type ReelFile = {
  version: 1;
  media: Record<string, Media>;
  series: Series[];
  tagPresets: string[];
};

export const DEFAULT_TAG_PRESETS = [
  "Food",
  "People",
  "Landscape",
  "City",
  "Drone",
  "Sunset",
  "Selfie",
  "Nature",
  "Night",
];

export function emptyReel(): ReelFile {
  return { version: 1, media: {}, series: [], tagPresets: [...DEFAULT_TAG_PRESETS] };
}
