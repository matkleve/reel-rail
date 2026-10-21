import type { Media } from "@/types";

import { freeName, namesIn } from "./names";
import { getMediaFile } from "./session";

/** Folder-safe version of a series title (keeps umlauts, drops path syntax). */
export function folderName(title: string): string {
  const clean = title
    // Control characters are exactly what must go; the lint rule guards against accidental ones.
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    // Chromium mis-resolves folder names with en/em dashes (docs/TRAPS.md): plain hyphens on disk.
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return clean.slice(0, 120) || "Series";
}

/** `01_IMG_1234.jpg` — zero-padded to at least two digits, more for long series. */
export function exportName(index: number, total: number, path: string): string {
  const width = Math.max(2, String(total).length);
  const base = path.slice(path.lastIndexOf("/") + 1);
  return `${String(index + 1).padStart(width, "0")}_${base}`;
}

/** A new sub-folder `name`, or `name (2)` … if taken. */
export async function uniqueDir(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  const names = await namesIn(parent);
  return parent.getDirectoryHandle(freeName(name, (n) => names.has(n), true), { create: true });
}

/**
 * Copies the series' files, in order, into `<target>/<title>/`. Originals are
 * only read. Returns the path to show the user ("Exports/Porto – …").
 */
export async function exportSeries(
  target: FileSystemDirectoryHandle,
  title: string,
  media: Media[],
  onProgress: (done: number) => void,
): Promise<string> {
  const dir = await uniqueDir(target, folderName(title));
  for (const [i, m] of media.entries()) {
    const file = await getMediaFile(m);
    const out = await dir.getFileHandle(exportName(i, media.length, m.path), { create: true });
    const w = await out.createWritable();
    // pipeTo closes the writable on success — streaming keeps 4 GB videos out of RAM.
    await file.stream().pipeTo(w);
    onProgress(i + 1);
  }
  return `${target.name}/${dir.name}`;
}
