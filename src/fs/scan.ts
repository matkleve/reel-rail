import type { ReelFile } from "@/types";

import { hashFile } from "./hash";
import { readMetadata } from "./metadata";
import { reconcile, type Scanned } from "./reconcile";
import { walk, type FoundFile } from "./walk";

export type ScanProgress = { phase: "listing" | "hashing"; done: number; total: number };

const CONCURRENCY = 4;

/**
 * Lists every media file, identifies it, and merges the result into `prev`.
 *
 * Unchanged files (same path, size and mtime as last time) reuse their id
 * without being read at all — that is what makes re-opening a folder of
 * 2,000 files near-instant.
 */
export async function scanFolder(
  root: FileSystemDirectoryHandle,
  prev: ReelFile,
  onProgress: (p: ScanProgress) => void,
): Promise<ReelFile> {
  const found = await walk(root, (n) => onProgress({ phase: "listing", done: 0, total: n }));

  const byPath = new Map(Object.values(prev.media).map((m) => [m.path, m]));
  const results: Scanned[] = [];
  let done = 0;
  onProgress({ phase: "hashing", done, total: found.length });

  const identify = async (f: FoundFile) => {
    const file = await f.handle.getFile();
    const known = byPath.get(f.path);
    if (known && known.size === file.size && known.mtime === file.lastModified) {
      results.push({ id: known.id, path: f.path, type: f.type, size: file.size, mtime: file.lastModified });
    } else {
      const { id, head, tail } = await hashFile(file);
      const meta = prev.media[id] ? undefined : await readMetadata(file, f.type, head, tail);
      results.push({ id, path: f.path, type: f.type, size: file.size, mtime: file.lastModified, meta });
    }
    done++;
    onProgress({ phase: "hashing", done, total: found.length });
  };

  let next = 0;
  const worker = async () => {
    while (next < found.length) {
      const f = found[next++]!;
      try {
        await identify(f);
      } catch (err) {
        // One unreadable file (permissions, cloud placeholder) must not sink the scan.
        console.warn(`reel-rail: skipped ${f.path}`, err);
        done++;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return reconcile(prev, results);
}
