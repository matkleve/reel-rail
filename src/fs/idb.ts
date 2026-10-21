/**
 * The app's one IndexedDB database. Two stores:
 * - "handles": folder handles (folder mode), so a reopen is one click
 * - "kv":      plain values — the files-mode library lives here
 */

const DB = "reel-rail";
const VERSION = 2;
export type Store = "handles" | "kv";

let opening: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      // v1 had only "handles"; create whatever is missing, keep what exists.
      for (const name of ["handles", "kv"]) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = undefined;
      reject(req.error);
    };
  });
  return opening;
}

async function tx<T>(store: Store, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(store: Store, key: string): Promise<T | undefined> {
  try {
    return (await tx(store, "readonly", (s) => s.get(key))) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function idbSet(store: Store, key: string, value: unknown): Promise<void> {
  await tx(store, "readwrite", (s) => s.put(value, key));
}
