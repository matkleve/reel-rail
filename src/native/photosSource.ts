import { t } from "@/i18n";
import { idbGet, idbSet } from "@/fs/idb";
import { normalize } from "@/fs/reelFile";
import type { SessionFiles, Source, SourceFile } from "@/fs/source";
import type { ReelFile } from "@/types";

import { assetFile, PhotoLibrary, type PhotoAsset } from "./photoLibrary";

const LIBRARY_KEY = "photos-library";
/** Originals kept in memory after export: the top card, the one under it, a few just thrown. */
const KEEP_FILES = 6;

/**
 * Identity in the native app is the Photos id, not the content hash
 * (docs/NATIVE.md § identity). Hashing needs the bytes, and getting the bytes
 * means copying every original out of the library first — for a phone full
 * of videos, minutes of waiting before the first card. The trade: the same
 * photo on the computer is a different item. That costs nothing today, as
 * the native app is the Free tier with no rating sync; revisit if sync comes
 * to the app.
 */
export function assetId(asset: Pick<PhotoAsset, "id">): string {
  return `ph-${asset.id.replace(/[^\w-]/g, "_")}`;
}

/** "IMG_0001.HEIC", then "IMG_0001 (2).HEIC" — the way files mode names repeats. */
export function uniquePath(name: string, taken: ReadonlySet<string>): string {
  const dot = name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 1; ; n++) {
    const path = n === 1 ? name : `${stem} (${n})${ext}`;
    if (!taken.has(path)) return path;
  }
}

/**
 * The library as source files: no file is read. Paths are the original file
 * names, made unique (Photos reuses IMG_0001 every 10,000 shots). Oldest
 * first, so a name keeps its path as the library grows.
 */
export function photoFiles(assets: PhotoAsset[], read: (a: PhotoAsset) => Promise<File>): SourceFile[] {
  const taken = new Set<string>();
  const byAge = [...assets].sort((a, b) => (a.takenAt ?? "").localeCompare(b.takenAt ?? "") || a.id.localeCompare(b.id));
  return byAge.map((a) => {
    const mtime = a.takenAt ? Date.parse(a.takenAt) : 0;
    const path = uniquePath(a.name, taken);
    taken.add(path);
    return {
      path,
      type: a.type,
      file: () => read(a),
      known: {
        id: assetId(a),
        size: 0,
        mtime,
        meta: { takenAt: a.takenAt ?? new Date(mtime).toISOString(), ...(a.gps && { gps: a.gps }) },
      },
    };
  });
}

/**
 * The iPhone's Photos library, in the native app. Read-only like files mode
 * (`kind: "files"`): discards are hidden after their countdown, never deleted
 * from Photos — deleting into "Recently Deleted" waits for its own
 * edit-or-leave choice (hard rule 1).
 */
export class PhotosSource implements Source, SessionFiles {
  readonly kind = "files";
  readonly name = t("Photos");
  private byPath = new Map<string, PhotoAsset>();
  private session = new Map<string, File>();
  private recent = new Map<string, Promise<File>>();

  async list(onFound?: (count: number) => void): Promise<SourceFile[]> {
    const { assets } = await PhotoLibrary.listAssets();
    const files = photoFiles(assets, (a) => assetFile(a));
    const byId = new Map(assets.map((a) => [assetId(a), a]));
    this.byPath = new Map(files.map((f) => [f.path, byId.get(f.known!.id)!]));
    onFound?.(files.length);
    return files;
  }

  getFile(path: string): Promise<File> {
    const made = this.session.get(path);
    if (made) return Promise.resolve(made);
    const cached = this.recent.get(path);
    if (cached) return cached;
    const asset = this.byPath.get(path);
    if (!asset) return Promise.reject(new Error(t("“{path}” is no longer in Photos", { path })));
    const file = assetFile(asset);
    this.recent.set(path, file);
    // A failed export must not stay cached as the answer.
    file.catch(() => this.recent.delete(path));
    if (this.recent.size > KEEP_FILES) this.recent.delete(this.recent.keys().next().value!);
    return file;
  }

  put(file: File): string {
    const path = uniquePath(file.name, new Set([...this.byPath.keys(), ...this.session.keys()]));
    this.session.set(path, file);
    return path;
  }

  /** Strict, like files mode: a failed read must not look like "no library yet". */
  async loadReel(): Promise<ReelFile> {
    const raw = await idbGet<string>("kv", LIBRARY_KEY, { strict: true });
    return normalize(raw ? JSON.parse(raw) : {});
  }

  async saveReel(reel: ReelFile): Promise<void> {
    await idbSet("kv", LIBRARY_KEY, JSON.stringify(reel));
  }
}
