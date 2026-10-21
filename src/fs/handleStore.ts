/**
 * Remembers folder handles in IndexedDB, so the next start is a single
 * "allow access again" click. Handles are structured-cloneable, so they go
 * into IndexedDB as-is — localStorage cannot hold them.
 */
import { idbGet, idbSet } from "./idb";

/** "root" = the opened source folder, "picks" = the Space-key target folder. */
export type HandleKey = "root" | "picks";

export async function saveHandle(key: HandleKey, handle: FileSystemDirectoryHandle): Promise<void> {
  await idbSet("handles", key, handle);
}

export async function loadHandle(key: HandleKey): Promise<FileSystemDirectoryHandle | undefined> {
  return idbGet<FileSystemDirectoryHandle>("handles", key);
}

/** Asks for readwrite permission; must be called from a user gesture. */
export async function ensurePermission(handle: FileSystemHandle): Promise<boolean> {
  const opts = { mode: "readwrite" } as const;
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}
