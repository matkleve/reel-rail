import { DISCARD, GRACE_SECONDS, KEEP_DAYS, type Media, type ReelFile } from "@/types";

const DAY = 864e5;

/**
 * The life of a discard — pure rules, so they can be tested without a disk.
 *
 *   rated discard ──GRACE_SECONDS──▶ off the rail ("Recently deleted")
 *                                    folder edited in place: file moved to _reel_trash/
 *                  ──KEEP_DAYS────▶ deleted for good (only files in _reel_trash/
 *                                    that reel-rail moved there itself)
 *
 * Deleting for good only ever touches `binned.path` — a path reel-rail
 * created when it moved the file — never a file in the library itself, and
 * never byte-identical copies elsewhere (`altPaths`: an export or a picks
 * copy may be exactly that).
 */

export const GRACE_MS = GRACE_SECONDS * 1000;

/** Discards whose countdown is over and that are still on the rail. */
export function dueToLeave(reel: ReelFile, now = Date.now(), graceMs = GRACE_MS): Media[] {
  return Object.values(reel.media).filter(
    (m) =>
      m.rating === DISCARD &&
      !m.binned &&
      !m.missing &&
      m.discardedAt !== undefined &&
      new Date(m.discardedAt).getTime() + graceMs <= now,
  );
}

/** Seconds of countdown left, for the bar on the card. */
export function secondsLeft(m: Media, now = Date.now(), graceMs = GRACE_MS): number {
  if (m.rating !== DISCARD || !m.discardedAt) return 0;
  return Math.max(0, (new Date(m.discardedAt).getTime() + graceMs - now) / 1000);
}

/** When something goes into "Recently deleted", it stays this long. */
export function binUntil(now = Date.now()): string {
  return new Date(now + KEEP_DAYS * DAY).toISOString();
}

/** Whole days until a binned file is deleted for good, at least 0. */
export function daysLeft(m: Media, now = Date.now()): number | undefined {
  if (!m.binned) return undefined;
  return Math.max(0, Math.ceil((new Date(m.binned.until).getTime() - now) / DAY));
}

/** Binned files whose time is up. Hidden-only entries (no path) never are — there is no file of ours to delete. */
export function dueForDeletion(reel: ReelFile, now = Date.now()): Media[] {
  return Object.values(reel.media).filter(
    (m) => m.binned?.path !== undefined && new Date(m.binned.until).getTime() <= now,
  );
}

/** The reel without the given media (and without them in any series). */
export function withoutMedia(reel: ReelFile, ids: Iterable<string>): ReelFile {
  const gone = new Set(ids);
  const media = Object.fromEntries(Object.entries(reel.media).filter(([id]) => !gone.has(id)));
  const series = reel.series.map((s) => ({ ...s, mediaIds: s.mediaIds.filter((id) => !gone.has(id)) }));
  return { ...reel, media, series };
}

/**
 * Removes one file for good. A file that is already gone counts as deleted
 * (that is the goal); anything else throws.
 */
export async function deletePath(root: FileSystemDirectoryHandle, path: string): Promise<void> {
  const parts = path.split("/");
  const name = parts.pop()!;
  try {
    let dir = root;
    for (const p of parts) dir = await dir.getDirectoryHandle(p);
    await dir.removeEntry(name);
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") return;
    throw err;
  }
}
