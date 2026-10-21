import { getMediaFile, getSource } from "@/fs/session";
import { renamed, shareFiles } from "@/fs/share";
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
  if (getSource().kind === "files") return toggleMark(items);

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

/**
 * Files mode has no folder to copy into: a pick is a mark, and the picks are
 * handed over together with "Share picks" (share sheet / downloads).
 */
function toggleMark(items: Media[]): void {
  const off = items.every(isPicked);
  const at = new Date().toISOString();
  useReel.getState().patch(
    items.map((m) => m.id),
    (m) => ({
      ...m,
      exportedTo: off ? m.exportedTo.filter((e) => e.series !== PICKS) : isPicked(m) ? m.exportedTo : [...m.exportedTo, { series: PICKS, at }],
    }),
  );
  showToast(off ? "Unpicked" : `Picked${items.length > 1 ? ` ${items.length}` : ""} — share them with “Share picks”`);
}

/** All picked items that are loaded right now, in timeline order. */
export function pickedMedia(): Media[] {
  const { order, reel } = useReel.getState();
  return order.flatMap((id) => (reel.media[id] && isPicked(reel.media[id]) ? [reel.media[id]] : []));
}

/** Files mode: hand every pick to the share sheet (or download them). From a click only. */
export async function sharePicks(): Promise<void> {
  const items = pickedMedia();
  if (!items.length) {
    showToast("Nothing picked yet — tap Pick (or press Space) on a photo first");
    return;
  }
  try {
    const files = await Promise.all(items.map(async (m) => renamed(await getMediaFile(m), baseName(m.path))));
    const result = await shareFiles(files, "reel-rail picks");
    if (result === "downloaded") showToast(`${files.length} files downloaded`);
  } catch (err) {
    showToast(`Could not share: ${err instanceof Error ? err.message : err}`, "error");
  }
}
