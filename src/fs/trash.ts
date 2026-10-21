import { freeName, namesIn } from "./names";

export const TRASH_DIR = "_reel_trash";

async function dirAt(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create });
  return dir;
}

type Movable = FileSystemFileHandle & { move?: (dir: FileSystemDirectoryHandle, name?: string) => Promise<void> };

/**
 * Moves a file inside the folder; never overwrites. Returns the path it got.
 *
 * Uses `FileSystemHandle.move()` where Chrome has it. Otherwise copy, check
 * the copy's size, and only then remove the original entry — so a failure
 * at any point leaves the original in place.
 */
export async function moveFile(
  root: FileSystemDirectoryHandle,
  from: string,
  to: string,
  taken: Set<string> = new Set(),
): Promise<string> {
  const src = from.split("/");
  const srcName = src.pop()!;
  const dst = to.split("/");
  const wanted = dst.pop()!;
  const fromDir = await dirAt(root, src, false);
  const toDir = await dirAt(root, dst, true);
  const handle = (await fromDir.getFileHandle(srcName)) as Movable;
  // Neither on disk nor in `taken` (paths reel-rail already handed out — a file the user
  // deleted from the trash by hand must not make its old path look free while a record points at it).
  const onDisk = await namesIn(toDir);
  const prefix = dst.length ? `${dst.join("/")}/` : "";
  const name = freeName(wanted, (n) => onDisk.has(n) || taken.has(prefix + n));

  if (typeof handle.move === "function") {
    await handle.move(toDir, name);
  } else {
    const file = await handle.getFile();
    const copy = await toDir.getFileHandle(name, { create: true });
    await file.stream().pipeTo(await copy.createWritable());
    if ((await copy.getFile()).size !== file.size) throw new Error(`copy of ${from} is incomplete`);
    await fromDir.removeEntry(srcName);
  }
  return [...dst, name].join("/");
}

/** Into `_reel_trash/<same relative path>` — out of the library; the scanner skips that folder. */
export function moveToTrash(root: FileSystemDirectoryHandle, path: string, taken: Set<string>): Promise<string> {
  return moveFile(root, path, `${TRASH_DIR}/${path}`, taken);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}
