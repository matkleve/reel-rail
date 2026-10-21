import { deletePaths, dueNow, pathsOf, withoutMedia } from "@/fs/deletion";
import { getFolder } from "@/fs/session";
import { formatBytes } from "@/fs/trash";
import type { BinEntry, Media } from "@/types";

import { useReel } from "./useReel";
import { showToast } from "./useUi";

/**
 * Deletes media files and bin entries for good, then drops them from the
 * reel. A medium only leaves the reel when every one of its paths is gone —
 * a partial failure keeps the record, and it is tried again next time.
 */
async function destroy(media: Media[], bin: BinEntry[], onProgress?: (done: number) => void) {
  const root = getFolder().dir;
  const { deleted, failed } = await deletePaths(
    root,
    [...media.flatMap(pathsOf), ...bin.map((b) => b.path)],
    onProgress,
  );
  const gone = new Set(deleted);
  const ids = media.filter((m) => pathsOf(m).every((p) => gone.has(p))).map((m) => m.id);
  const bytes = media.filter((m) => ids.includes(m.id)).reduce((n, m) => n + (m.size ?? 0), 0);

  // The current reel, not a snapshot: ratings may have changed while files were deleted.
  const reel = useReel.getState().reel;
  const next = withoutMedia(reel, ids);
  const leftBin = (reel.bin ?? []).filter((b) => !gone.has(b.path));
  if (leftBin.length) next.bin = leftBin;
  else delete next.bin;
  useReel.getState().refresh(next);
  return { count: ids.length, bytes, failed: failed.length };
}

/**
 * After a folder is opened (and freshly scanned, so every path is verified):
 * deletes discards whose 30 days are over, and expired bin entries.
 */
export async function purgeDue(): Promise<void> {
  const { media, bin } = dueNow(useReel.getState().reel);
  if (!media.length && !bin.length) return;
  try {
    const r = await destroy(media, bin);
    if (r.count)
      showToast(
        `Deleted ${r.count} ${r.count === 1 ? "discard" : "discards"} after 30 days · ${formatBytes(r.bytes)} freed`,
      );
    if (r.failed) showToast(`${r.failed} files could not be deleted — trying again next time`, "error");
  } catch (err) {
    console.error(err);
    showToast(`Deleting old discards failed: ${err instanceof Error ? err.message : err}`, "error");
  }
}

/** "Delete now" in the Discards view — the user confirmed it. */
export async function deleteNow(media: Media[], onProgress: (done: number) => void) {
  return destroy(media, [], onProgress);
}
