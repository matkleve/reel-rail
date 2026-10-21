/**
 * The app's one IndexedDB database. Two stores:
 * - "handles": folder handles (folder mode), so a reopen is one click
 * - "kv":      plain values — the files-mode library lives here
 *
 * One cached connection, dropped and reopened whenever it dies: Safari closes
 * IndexedDB connections of backgrounded pages, and in files mode this is the
 * only storage there is.
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
    req.onsuccess = () => {
      const db = req.result;
      // Let a newer version (another tab after an update) take over; reopen lazily.
      db.onversionchange = () => {
        db.close();
        opening = undefined;
      };
      db.onclose = () => {
        opening = undefined;
      };
      resolve(db);
    };
    req.onerror = () => {
      opening = undefined;
      reject(req.error);
    };
    // An older version open in another tab (or the installed app) holds the
    // upgrade. Say so instead of hanging; the next call tries again.
    req.onblocked = () => {
      opening = undefined;
      reject(new Error("reel-rail is open in another tab or window with an older version — close it and reload."));
    };
  });
  return opening;
}

async function tx<T>(store: Store, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  let db = await open();
  let transaction: IDBTransaction;
  try {
    transaction = db.transaction(store, mode);
  } catch (err) {
    // A connection closed under us (InvalidStateError): reopen once.
    if (!(err instanceof DOMException) || err.name !== "InvalidStateError") throw err;
    opening = undefined;
    db = await open();
    transaction = db.transaction(store, mode);
  }
  return new Promise((resolve, reject) => {
    const req = run(transaction.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** `strict`: throw on failure instead of reporting "not found". */
export async function idbGet<T>(store: Store, key: string, opts: { strict?: boolean } = {}): Promise<T | undefined> {
  try {
    return (await tx(store, "readonly", (s) => s.get(key))) as T | undefined;
  } catch (err) {
    if (opts.strict) throw err;
    return undefined;
  }
}

export async function idbSet(store: Store, key: string, value: unknown): Promise<void> {
  await tx(store, "readwrite", (s) => s.put(value, key));
}
