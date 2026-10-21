import type { ReelFile } from "@/types";

import { idbGet, idbSet } from "./idb";
import { normalize } from "./reelFile";
import type { Source, SourceFile } from "./source";
import { mediaTypeOf } from "./walk";

const LIBRARY_KEY = "library";

/** What the start screen needs to say "welcome back". */
export async function savedLibrarySize(): Promise<number> {
  const raw = await idbGet<string>("kv", LIBRARY_KEY);
  if (!raw) return 0;
  try {
    return Object.keys(normalize(JSON.parse(raw)).media).length;
  } catch {
    return 0;
  }
}

/** Media type from MIME first (iOS names are not reliable), then the extension. */
export function typeOfFile(file: Pick<File, "name" | "type">) {
  if (file.type.startsWith("image/")) return "photo" as const;
  if (file.type.startsWith("video/")) return "video" as const;
  return mediaTypeOf(file.name);
}

type Key = { size: number; lastModified: number };

/**
 * The path a picked file gets. The folder path when the browser gives one
 * (desktop folder pick), else the name. Two *different* files with the same
 * name — iOS hands out "image.jpg" more than once — get "image (2).jpg";
 * the *same* file picked twice keeps its first path.
 */
export function pathFor(file: Pick<File, "name"> & Key & { webkitRelativePath?: string }, taken: Map<string, Key>): string {
  const base = file.webkitRelativePath || file.name;
  const dot = base.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [base.slice(0, dot), base.slice(dot)] : [base, ""];
  for (let n = 1; ; n++) {
    const path = n === 1 ? base : `${stem} (${n})${ext}`;
    const other = taken.get(path);
    if (!other || (other.size === file.size && other.lastModified === file.lastModified)) return path;
  }
}

/** Files handed over by the system picker. They live for this session only. */
export class FilesSource implements Source {
  readonly kind = "files";
  readonly name: string;
  private files = new Map<string, File>();

  constructor(name = "My photos") {
    this.name = name;
  }

  /** Adds picked files (non-media is ignored). Returns how many media were new. */
  add(picked: Iterable<File>): number {
    let added = 0;
    for (const file of picked) {
      if (!typeOfFile(file)) continue;
      const path = pathFor(file, this.files);
      if (!this.files.has(path)) added++;
      this.files.set(path, file);
    }
    return added;
  }

  get size(): number {
    return this.files.size;
  }

  async list(onFound?: (count: number) => void): Promise<SourceFile[]> {
    const out = [...this.files].map(([path, f]) => ({ path, type: typeOfFile(f)!, file: async () => f }));
    onFound?.(out.length);
    return out;
  }

  async getFile(path: string): Promise<File> {
    const f = this.files.get(path);
    if (!f) throw new Error(`“${path}” is not loaded — add it again`);
    return f;
  }

  async loadReel(): Promise<ReelFile> {
    const raw = await idbGet<string>("kv", LIBRARY_KEY);
    return normalize(raw ? JSON.parse(raw) : {});
  }

  async saveReel(reel: ReelFile): Promise<void> {
    await idbSet("kv", LIBRARY_KEY, JSON.stringify(reel));
  }
}
