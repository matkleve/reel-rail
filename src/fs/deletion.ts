import { DISCARD, KEEP_DAYS, type BinEntry, type Media, type ReelFile } from "@/types";

const DAY = 864e5;

/**
 * Final deletion — the only code in reel-rail that destroys a file.
 *
 * Two things end here, both after KEEP_DAYS (or earlier on an explicit,
 * confirmed "Delete now"):
 * - discards: the file stays where it is while its clock runs, so changing
 *   your mind is just rating it up again;
 * - bin entries: originals of trimmed videos, parked in `_reel_trash/`.
 */

/** When a discard goes for good. Undefined for anything that is not a discard. */
export function deleteAt(m: Media): Date | undefined {
  if (m.rating !== DISCARD || !m.discardedAt) return undefined;
  return new Date(new Date(m.discardedAt).getTime() + KEEP_DAYS * DAY);
}

/** Whole days left, at least 0. */
export function daysLeft(m: Media, now = new Date()): number | undefined {
  const at = deleteAt(m);
  return at && Math.max(0, Math.ceil((at.getTime() - now.getTime()) / DAY));
}

/**
 * What is due now. A file that is missing (SD card not plugged in) is not
 * due: there is nothing to delete, and deleting its record would lose the
 * rating when the card comes back.
 */
export function dueNow(reel: ReelFile, now = new Date()): { media: Media[]; bin: BinEntry[] } {
  const media = Object.values(reel.media).filter((m) => {
    const at = deleteAt(m);
    return at && at <= now && !m.missing;
  });
  const bin = (reel.bin ?? []).filter((b) => new Date(b.deleteAfter) <= now);
  return { media, bin };
}

/** Every path of a medium: byte-identical duplicates are the same photo, discarded together. */
export function pathsOf(m: Media): string[] {
  return [m.path, ...(m.altPaths ?? [])];
}

/** The reel without the given media (and without them in any series). */
export function withoutMedia(reel: ReelFile, ids: Iterable<string>): ReelFile {
  const gone = new Set(ids);
  const media = Object.fromEntries(Object.entries(reel.media).filter(([id]) => !gone.has(id)));
  const series = reel.series.map((s) => ({
    ...s,
    mediaIds: s.mediaIds.filter((id) => !gone.has(id)),
  }));
  return { ...reel, media, series };
}

/**
 * Removes files from the folder for good. One path at a time; a file that is
 * already gone counts as deleted (that is the goal), any other failure is
 * reported and the rest goes on.
 */
export async function deletePaths(
  root: FileSystemDirectoryHandle,
  paths: string[],
  onProgress?: (done: number) => void,
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const [i, path] of paths.entries()) {
    const parts = path.split("/");
    const name = parts.pop()!;
    try {
      let dir = root;
      for (const p of parts) dir = await dir.getDirectoryHandle(p);
      await dir.removeEntry(name);
      deleted.push(path);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") deleted.push(path);
      else {
        console.warn(`reel-rail: could not delete ${path}`, err);
        failed.push(path);
      }
    }
    onProgress?.(i + 1);
  }
  return { deleted, failed };
}
