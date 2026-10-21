import type { MediaType } from "@/types";

const PHOTO_EXT = new Set(["jpg", "jpeg", "png", "heic", "heif", "webp"]);
const VIDEO_EXT = new Set(["mp4", "mov", "m4v"]);

/** Folders reel-rail owns or that never hold the user's media. */
const SKIP_DIRS = new Set(["_reel_trash", "node_modules", "@eaDir"]);

export type FoundFile = { path: string; handle: FileSystemFileHandle; type: MediaType };

export function mediaTypeOf(name: string): MediaType | undefined {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (PHOTO_EXT.has(ext)) return "photo";
  if (VIDEO_EXT.has(ext)) return "video";
  return undefined;
}

/** Recursively lists media files. Hidden entries (`.`-prefixed) are skipped. */
export async function walk(
  dir: FileSystemDirectoryHandle,
  onFound?: (count: number) => void,
  prefix = "",
  out: FoundFile[] = [],
): Promise<FoundFile[]> {
  for await (const entry of dir.values()) {
    if (entry.name.startsWith(".")) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(entry, onFound, path, out);
    } else {
      const type = mediaTypeOf(entry.name);
      if (!type) continue;
      out.push({ path, handle: entry, type });
      onFound?.(out.length);
    }
  }
  return out;
}

/** Resolves a relative path back to a file handle. */
export async function fileAt(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle> {
  const parts = path.split("/");
  const name = parts.pop()!;
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p);
  return dir.getFileHandle(name);
}
