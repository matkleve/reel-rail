import { getMediaFile } from "@/fs/session";
import { copyInto, getPicksFolder, removeCopy } from "@/fs/picksFolder";
import { PICKS, type Media } from "@/types";

import { targetIds, useReel } from "./useReel";
import { showToast, useUi } from "./useUi";

const isPicked = (m: Media) => m.exportedTo.some((e) => e.series === PICKS);
const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/**
 * Space: copy the current item (or the selection) into the picks folder — or,
 * if all of them are already there, take the copies back out again.
 * Originals are only read.
 */
export async function togglePick(): Promise<void> {
  const s = useReel.getState();
  const items = targetIds(s).flatMap((id) => (s.reel.media[id] ? [s.reel.media[id]] : []));
  if (!items.length) return;

  let dir: FileSystemDirectoryHandle;
  try {
    dir = await getPicksFolder();
  } catch {
    return; // picker closed
  }
  useUi.getState().set({ picksFolderName: dir.name });

  try {
    if (items.every(isPicked)) await takeBack(dir, items);
    else await copy(dir, items.filter((m) => !isPicked(m)));
  } catch (err) {
    showToast(`Could not write to “${dir.name}”: ${err instanceof Error ? err.message : err}`, "error");
  }
}

async function copy(dir: FileSystemDirectoryHandle, items: Media[]): Promise<void> {
  for (const m of items) {
    const name = await copyInto(dir, await getMediaFile(m), baseName(m.path));
    const record = { series: PICKS, at: new Date().toISOString(), path: `${dir.name}/${name}` };
    useReel.getState().patch([m.id], (x) => ({ ...x, exportedTo: [...x.exportedTo, record] }));
  }
  showToast(items.length === 1 ? `Copied to ${dir.name}` : `${items.length} items copied to ${dir.name}`);
}

async function takeBack(dir: FileSystemDirectoryHandle, items: Media[]): Promise<void> {
  let kept = 0;
  for (const m of items) {
    for (const rec of m.exportedTo.filter((e) => e.series === PICKS)) {
      const name = rec.path?.slice(rec.path.indexOf("/") + 1);
      if (name && !(await removeCopy(dir, name, m.size ?? -1))) kept++;
    }
    useReel.getState().patch([m.id], (x) => ({ ...x, exportedTo: x.exportedTo.filter((e) => e.series !== PICKS) }));
  }
  showToast(
    kept
      ? `Removed from the list — ${kept} copy(ies) left in ${dir.name} because they changed`
      : `Removed from ${dir.name}`,
  );
}
