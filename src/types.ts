/**
 * The shape of `.reel.json` — the single source of truth inside the opened
 * folder. Original media files are never written to; everything the user
 * decides lives here.
 *
 * Fields beyond the original contract are optional so that an older file
 * always still parses (see README § .reel.json).
 */

/** Five levels: 2 favorite, 1 good, 0 normal, −1 not great, −2 discard. */
export type Rating = -2 | -1 | 0 | 1 | 2;

export const RATING_LABEL: Record<Rating, string> = {
  [2]: "Favorite",
  [1]: "Good",
  [0]: "Normal",
  [-1]: "Not great",
  [-2]: "Discard",
};
export const DISCARD: Rating = -2;
/** Days a discard (or a trimmed video's original) is kept before it is deleted for good. */
export const KEEP_DAYS = 30;

/** CSS class per rating: r2, r1, r0, rm1, rm2. */
export function ratingClass(r: Rating): string {
  return r < 0 ? `rm${-r}` : `r${r}`;
}
export type MediaType = "photo" | "video";

/**
 * `series` is a Series id, or PICKS for the Space-key picks folder.
 * `path` is where the copy went ("<folder>/<file>"), so it can be taken back.
 */
export type ExportRecord = { series: string; at: string; path?: string };

export const PICKS = "picks";

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
  /**
   * When it was rated discard (ISO). Folder mode deletes the file for good
   * KEEP_DAYS later — like a phone's "Recently deleted". Cleared when the
   * rating goes back up.
   */
  discardedAt?: string;
};

/**
 * A file reel-rail moved out of the library into `_reel_trash/` (the
 * original of a trimmed video). Deleted for good after `deleteAfter`.
 */
export type BinEntry = { path: string; deleteAfter: string; was: string };

export type Series = {
  id: string;
  title: string;
  mediaIds: string[];
  createdAt: string;
  exportedPath?: string;
};

/**
 * Version 2 introduced the five-level rating. Version 1 files are migrated on
 * load (their −1 "unusable" becomes −2 "discard").
 */
export type ReelFile = {
  version: 2;
  media: Record<string, Media>;
  series: Series[];
  tagPresets: string[];
  /** Files waiting in `_reel_trash/` for their final deletion. */
  bin?: BinEntry[];
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
  return { version: 2, media: {}, series: [], tagPresets: [...DEFAULT_TAG_PRESETS] };
}
