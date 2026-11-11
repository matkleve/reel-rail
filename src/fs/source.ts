import type { MediaType, ReelFile } from "@/types";

import type { Meta } from "./metadata";

/**
 * What a source already knows about a file without reading it. The Photos
 * library hands out an id and the capture metadata for free; reading every
 * original just to hash it would copy the whole library first — the wait the
 * native app exists to avoid.
 */
export type Known = { id: string; size: number; mtime: number; meta: Meta };

/** One media file as a source lists it. `file()` is lazy: listing must not read anything. */
export type SourceFile = { path: string; type: MediaType; file(): Promise<File>; known?: Known };

/** A source that can hold a file made in this session (a trimmed video, files mode). */
export interface SessionFiles {
  put(file: File): string;
}

/**
 * Where media come from and where `.reel.json` lives.
 *
 * - "folder": a real folder via the File System Access API (Chrome/Edge
 *   desktop). Can write: `.reel.json` next to the photos, picks folder, trash.
 * - "files":  files handed over by the system picker (iPad, Safari, Firefox,
 *   Brave). Read-only access that lasts one session; the library is kept in
 *   IndexedDB and media come back by content hash when picked again.
 */
export interface Source {
  readonly kind: "folder" | "files";
  readonly name: string;
  list(onFound?: (count: number) => void): Promise<SourceFile[]>;
  getFile(path: string): Promise<File>;
  loadReel(): Promise<ReelFile>;
  saveReel(reel: ReelFile): Promise<void>;
}
