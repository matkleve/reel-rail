import type { Media } from "@/types";

import { uniqueDir } from "./exportSeries";
import { getMediaFile } from "./session";
import { trimToWritable, trimmedTakenAt } from "./trimVideo";

/**
 * "Leave the folder as it is" ends here: everything kept is copied into
 * `<target>/<name>/`, sub-folders as they were, trims applied (lossless).
 * The source folder is only read.
 */
export async function exportResult(
  target: FileSystemDirectoryHandle,
  name: string,
  media: Media[],
  onProgress: (done: number) => void,
): Promise<string> {
  const root = await uniqueDir(target, name);
  for (const [i, m] of media.entries()) {
    const parts = m.path.split("/");
    const fileName = parts.pop()!;
    let dir = root;
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
    const file = await getMediaFile(m);
    const out = await (await dir.getFileHandle(fileName, { create: true })).createWritable();
    if (m.type === "video" && m.trim) {
      await trimToWritable(file, m.trim, await trimmedTakenAt(file, m.takenAt, m.trim.start), out);
    } else {
      // pipeTo closes the writable on success — streaming keeps 4 GB videos out of RAM.
      await file.stream().pipeTo(out);
    }
    onProgress(i + 1);
  }
  return `${target.name}/${root.name}`;
}
