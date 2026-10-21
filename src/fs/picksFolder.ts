import { ensurePermission, loadHandle, saveHandle } from "./handleStore";

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

async function exists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** Copies under the original name; "name (2).ext" if that is taken. Returns the name used. */
export async function copyInto(dir: FileSystemDirectoryHandle, file: File, name: string): Promise<string> {
  const dot = name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let candidate = name;
  for (let n = 2; await exists(dir, candidate); n++) candidate = `${stem} (${n})${ext}`;
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
