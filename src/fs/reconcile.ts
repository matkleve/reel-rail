import type { Media, MediaType, ReelFile } from "@/types";

import type { Meta } from "./metadata";

/** One file as seen by the current scan. `meta` is only read for new ids. */
export type Scanned = {
  id: string;
  path: string;
  type: MediaType;
  size: number;
  mtime: number;
  meta?: Meta;
};

/**
 * Merges a fresh scan into the existing reel file. Pure, so the rules can be
 * tested without a file system:
 *
 * - known id → keeps rating/tags/exports, path follows the file (renames).
 * - same id at two paths → one Media, extra paths go to `altPaths`.
 * - id no longer found → `missing: true`, never deleted (ratings survive a
 *   disconnected SD card).
 * - new id → fresh Media at rating 0.
 */
export function reconcile(prev: ReelFile, scanned: Scanned[]): ReelFile {
  const media: Record<string, Media> = {};
  const sorted = [...scanned].sort((a, b) => a.path.localeCompare(b.path));

  for (const s of sorted) {
    const seen = media[s.id];
    if (seen) {
      if (seen.path !== s.path) seen.altPaths = [...(seen.altPaths ?? []), s.path];
      continue;
    }
    const old = prev.media[s.id];
    const base: Media = old ?? {
      id: s.id,
      path: s.path,
      type: s.type,
      takenAt: s.meta?.takenAt ?? new Date(s.mtime).toISOString(),
      ...(s.meta?.gps && { gps: s.meta.gps }),
      rating: 0,
      tags: [],
      exportedTo: [],
    };
    const next: Media = { ...base, path: s.path, size: s.size, mtime: s.mtime };
    delete next.missing;
    delete next.altPaths;
    media[s.id] = next;
  }

  for (const [id, old] of Object.entries(prev.media)) {
    if (!media[id]) media[id] = { ...old, missing: true };
  }

  return { ...prev, media };
}
