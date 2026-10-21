/**
 * Remembers the last opened folder handle in IndexedDB, so the next start is
 * a single "allow access again" click. Handles are structured-cloneable, so
 * they go into IndexedDB as-is — localStorage cannot hold them.
 */

const DB = "reel-rail";
const STORE = "handles";
const KEY = "root";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await tx("readwrite", (s) => s.put(handle, KEY));
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return (await tx("readonly", (s) => s.get(KEY))) as FileSystemDirectoryHandle | undefined;
  } catch {
    return undefined;
  }
}

/** Asks for readwrite permission; must be called from a user gesture. */
export async function ensurePermission(handle: FileSystemHandle): Promise<boolean> {
  const opts = { mode: "readwrite" } as const;
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}
