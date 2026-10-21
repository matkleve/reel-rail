import type { MediaType, ReelFile } from "@/types";

/** One media file as a source lists it. `file()` is lazy: listing must not read anything. */
export type SourceFile = { path: string; type: MediaType; file(): Promise<File> };

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
