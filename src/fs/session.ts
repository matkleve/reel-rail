import type { Media } from "@/types";

import type { FolderSource } from "./folderSource";
import type { Source } from "./source";

/**
 * The open source. Kept outside the zustand store on purpose: handles and
 * File objects are not serialisable state, and a store subscriber should
 * never re-render because one changed identity.
 */
let source: Source | undefined;

export function setSource(s: Source | undefined): void {
  source = s;
}

export function peekSource(): Source | undefined {
  return source;
}

export function getSource(): Source {
  if (!source) throw new Error("Nothing open");
  return source;
}

/** The folder, for what only a writable folder can do (trash). */
export function getFolder(): FolderSource {
  const s = getSource();
  if (s.kind !== "folder") throw new Error("Only possible with a folder opened in Chrome or Edge");
  return s as FolderSource;
}

export function getMediaFile(media: Pick<Media, "path">): Promise<File> {
  return getSource().getFile(media.path);
}
