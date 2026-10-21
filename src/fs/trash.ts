import type { Media } from "@/types";

import { getRoot } from "./session";

export const TRASH_DIR = "_reel_trash";

async function dirAt(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create });
  return dir;
}

type Movable = FileSystemFileHandle & { move?: (dir: FileSystemDirectoryHandle, name?: string) => Promise<void> };

/**
 * Moves files into `_reel_trash/<same relative path>` inside the source
 * folder — out of the way, never deleted. The scanner skips that folder.
 *
 * Uses `FileSystemHandle.move()` where Chrome has it. Otherwise copy, check
 * the copy's size, and only then remove the original entry — so a failure
 * at any point leaves the original in place.
 */
export async function moveToTrash(
  items: Media[],
  onProgress: (done: number) => void,
): Promise<{ id: string; path: string }[]> {
  const root = getRoot();
  const moved: { id: string; path: string }[] = [];
  for (const [i, m] of items.entries()) {
    const parts = m.path.split("/");
    const name = parts.pop()!;
    const from = await dirAt(root, parts, false);
    const to = await dirAt(root, [TRASH_DIR, ...parts], true);
    const handle = (await from.getFileHandle(name)) as Movable;

    if (typeof handle.move === "function") {
      await handle.move(to, name);
    } else {
      const file = await handle.getFile();
      const copy = await to.getFileHandle(name, { create: true });
      await file.stream().pipeTo(await copy.createWritable());
      if ((await copy.getFile()).size !== file.size) throw new Error(`copy of ${m.path} is incomplete`);
      await from.removeEntry(name);
    }
    moved.push({ id: m.id, path: [TRASH_DIR, ...parts, name].join("/") });
    onProgress(i + 1);
  }
  return moved;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}
