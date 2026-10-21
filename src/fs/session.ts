import type { Media } from "@/types";

import { fileAt } from "./walk";

/**
 * The open folder. Kept outside the zustand store on purpose: handles are not
 * serialisable state, and a store subscriber should never re-render because a
 * handle object changed identity.
 */
let root: FileSystemDirectoryHandle | undefined;

export function setRoot(handle: FileSystemDirectoryHandle | undefined): void {
  root = handle;
}

export function getRoot(): FileSystemDirectoryHandle {
  if (!root) throw new Error("No folder open");
  return root;
}

export async function getMediaFile(media: Pick<Media, "path">): Promise<File> {
  return (await fileAt(getRoot(), media.path)).getFile();
}
