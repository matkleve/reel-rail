import { GRACE_MS, binUntil, deletePath, dueForDeletion, dueToLeave, withoutMedia } from "@/fs/deletion";
import { getFolder, getSource, peekSource } from "@/fs/session";
import { TRASH_DIR, formatBytes, moveFile, moveToTrash } from "@/fs/trash";
import { DISCARD, type Media } from "@/types";

import { useReel } from "./useReel";
import { showToast } from "./useUi";

/**
 * The life of a discard in the app: countdown on the rail → "Recently
 * deleted" → gone. Rules in fs/deletion.ts; this file does the moving and
 * keeps the reel in step.
 *
 * Every file operation re-reads the current reel right before it touches a
 * file and skips anything that changed meanwhile (rated up, restored,
 * another folder opened): the user may act while files are being moved.
 */

/** Tests (and impatient people) can shorten the countdown: localStorage "reel-rail:grace-seconds". */
export function graceMs(): number {
  try {
    const v = Number(localStorage.getItem("reel-rail:grace-seconds"));
    return v > 0 ? v * 1000 : GRACE_MS;
  } catch {
    return GRACE_MS;
  }
}

const reel = () => useReel.getState().reel;
const patch = (id: string, fn: (m: Media) => Media) =>
  useReel.getState().refresh({ ...reel(), media: { ...reel().media, [id]: fn(reel().media[id]!) } });

/** Paths in _reel_trash/ that records point at — never handed out twice. */
const takenBinPaths = () =>
  new Set(Object.values(reel().media).flatMap((m) => (m.binned?.path ? [m.binned.path] : [])));

/** Does the folder get changed? Only in folder mode, and only if the user chose to edit it in place. */
export function editsInPlace(): boolean {
  return getSource().kind === "folder" && reel().workflow === "edit";
}

let sweeping = false;

/** Takes discards whose countdown ran out off the rail; in place: into _reel_trash/. */
export async function sweep(): Promise<void> {
  if (sweeping || !peekSource()) return;
  // A folder that has not been told how to be worked on yet keeps everything where it is.
  if (getSource().kind === "folder" && !reel().workflow) return;
  const due = dueToLeave(reel(), Date.now(), graceMs());
  if (!due.length) return;
  sweeping = true;
  const source = getSource();
  try {
    for (const m of due) {
      const now = reel().media[m.id];
      // Rated up, restored or gone since the list was made: leave it.
      if (getSource() !== source || !now || now.rating !== DISCARD || now.binned || now.missing) continue;
      if (!editsInPlace()) {
        patch(m.id, (x) => ({ ...x, binned: { until: binUntil() } }));
        continue;
      }
      try {
        const file = await getSource().getFile(now.path);
        // The file at that path must still be the one that was rated.
        if (now.size !== undefined && (file.size !== now.size || file.lastModified !== now.mtime)) continue;
        const path = await moveToTrash(getFolder().dir, now.path, takenBinPaths());
        if (getSource() !== source) return;
        patch(m.id, (x) => ({ ...x, binned: { path, until: binUntil() } }));
      } catch (err) {
        console.warn(`reel-rail: could not move ${now.path} out`, err);
      }
    }
  } finally {
    sweeping = false;
  }
}

/** Runs the sweep every second while a library is open. */
export function startSweep(): () => void {
  const t = setInterval(() => void sweep(), 1000);
  return () => clearInterval(t);
}

/** Back from "Recently deleted" — onto the rail, rating normal, the file at its old place. */
export async function restore(id: string): Promise<void> {
  const m = reel().media[id];
  if (!m?.binned) return;
  let path = m.path;
  if (m.binned.path) {
    try {
      path = await moveFile(getFolder().dir, m.binned.path, m.path);
    } catch (err) {
      showToast(`Couldn’t bring it back: ${err instanceof Error ? err.message : err}`, "error");
      return;
    }
  }
  patch(id, (x) => {
    const next: Media = { ...x, path, rating: 0 };
    delete next.binned;
    delete next.discardedAt;
    delete next.missing;
    return next;
  });
}

/** Deletes binned files for good, re-checking each one right before. */
async function destroy(
  ids: string[],
  due: (m: Media) => boolean,
): Promise<{ count: number; bytes: number; failed: number }> {
  const source = getSource();
  const root = getFolder().dir;
  const gone: string[] = [];
  let bytes = 0;
  let failed = 0;
  for (const id of ids) {
    const m = reel().media[id];
    if (getSource() !== source) break;
    if (!m?.binned?.path || !due(m) || !m.binned.path.startsWith(`${TRASH_DIR}/`)) continue;
    try {
      await deletePath(root, m.binned.path);
      gone.push(id);
      bytes += m.size ?? 0;
    } catch (err) {
      console.warn(`reel-rail: could not delete ${m.binned.path}`, err);
      failed++;
    }
  }
  if (getSource() === source && gone.length) useReel.getState().refresh(withoutMedia(reel(), gone));
  return { count: gone.length, bytes, failed };
}

/** On opening a folder: what waited KEEP_DAYS in "Recently deleted" is deleted for good. */
export async function purgeDue(): Promise<void> {
  if (getSource().kind !== "folder") return;
  const ids = dueForDeletion(reel()).map((m) => m.id);
  if (!ids.length) return;
  const r = await destroy(ids, (m) => new Date(m.binned!.until).getTime() <= Date.now());
  if (r.count)
    showToast(`Deleted ${r.count} ${r.count === 1 ? "file" : "files"} after 30 days · ${formatBytes(r.bytes)} freed`);
  if (r.failed) showToast(`${r.failed} files could not be deleted — trying again next time`, "error");
}

/** "Delete now" in Recently deleted — confirmed by the user. */
export function deleteNow(ids: string[]) {
  return destroy(ids, () => true);
}
