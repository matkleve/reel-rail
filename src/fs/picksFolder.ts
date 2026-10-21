import { ensurePermission, loadHandle, saveHandle } from "./handleStore";
import { freeName, namesIn } from "./names";

/**
 * The picks folder — where Space drops a copy of the current item for further
 * use (posting, editing). Chosen once, remembered like the source folder.
 */

export async function pickPicksFolder(): Promise<FileSystemDirectoryHandle> {
  const dir = await window.showDirectoryPicker({ id: "reel-picks", mode: "readwrite" });
  await saveHandle("picks", dir);
  return dir;
}

/** The remembered folder if access is (or can be) granted, else a fresh pick. Needs a user gesture. */
export async function getPicksFolder(): Promise<FileSystemDirectoryHandle> {
  const known = await loadHandle("picks");
  if (known && (await ensurePermission(known).catch(() => false))) return known;
  return pickPicksFolder();
}

/** Copies under the original name; "name (2).ext" if that is taken. Returns the name used. */
export async function copyInto(dir: FileSystemDirectoryHandle, file: File, name: string): Promise<string> {
  const names = await namesIn(dir);
  const candidate = freeName(name, (n) => names.has(n));
  const w = await (await dir.getFileHandle(candidate, { create: true })).createWritable();
  await file.stream().pipeTo(w);
  return candidate;
}

/**
 * Takes back a copy reel-rail made. Only removes it if it still has the
 * original's size — a copy that was edited in the meantime is the user's now.
 */
export async function removeCopy(dir: FileSystemDirectoryHandle, name: string, size: number): Promise<boolean> {
  try {
    const f = await (await dir.getFileHandle(name)).getFile();
    if (f.size !== size) return false;
    await dir.removeEntry(name);
    return true;
  } catch {
    return false;
  }
}
