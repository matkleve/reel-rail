import type { Media } from "@/types";

import { getFolder } from "./session";

export const TRASH_DIR = "_reel_trash";

async function dirAt(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create });
  return dir;
}

type Movable = FileSystemFileHandle & { move?: (dir: FileSystemDirectoryHandle, name?: string) => Promise<void> };

/**
 * Moves files into `_reel_trash/<same relative path>` inside the source
 * folder — out of the library, deleted for good only when their bin entry
 * expires (see deletion.ts). The scanner skips that folder.
 *
 * Uses `FileSystemHandle.move()` where Chrome has it. Otherwise copy, check
 * the copy's size, and only then remove the original entry — so a failure
 * at any point leaves the original in place.
 */
export async function moveToTrash(
  items: Media[],
  onProgress: (done: number) => void,
): Promise<{ id: string; path: string }[]> {
  const root = getFolder().dir;
  const moved: { id: string; path: string }[] = [];
  for (const [i, m] of items.entries()) {
    const parts = m.path.split("/");
    const name = parts.pop()!;
    const from = await dirAt(root, parts, false);
    const to = await dirAt(root, [TRASH_DIR, ...parts], true);
    const handle = (await from.getFileHandle(name)) as Movable;
    // Trimming the same video twice parks two originals under one name: never overwrite.
    const target = await freeName(to, name);

    if (typeof handle.move === "function") {
      await handle.move(to, target);
    } else {
      const file = await handle.getFile();
      const copy = await to.getFileHandle(target, { create: true });
      await file.stream().pipeTo(await copy.createWritable());
      if ((await copy.getFile()).size !== file.size) throw new Error(`copy of ${m.path} is incomplete`);
      await from.removeEntry(name);
    }
    moved.push({ id: m.id, path: [TRASH_DIR, ...parts, target].join("/") });
    onProgress(i + 1);
  }
  return moved;
}

async function freeName(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  const dot = name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? name : `${stem} (${n})${ext}`;
    try {
      await dir.getFileHandle(candidate);
    } catch {
      return candidate;
    }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}
