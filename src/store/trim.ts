import { FilesSource } from "@/fs/filesSource";
import { hashFile } from "@/fs/hash";
import { getFolder, getMediaFile, getSource } from "@/fs/session";
import { moveToTrash } from "@/fs/trash";
import { trimToBlob, trimToWritable, trimmedTakenAt, type TrimRange } from "@/fs/trimVideo";
import { DISCARD, KEEP_DAYS, type BinEntry, type Media } from "@/types";

import { useReel, withRating } from "./useReel";

type Progress = (fraction: number) => void;
type Movable = FileSystemFileHandle & {
  move?: (name: string) => Promise<void>;
};

/**
 * Saving a trim. The trimmed video takes the original's place in the reel —
 * same rating, tags, place, series — under its new content id.
 *
 * Folder mode: the trimmed file replaces the original on disk; the original
 * goes to `_reel_trash/` and is deleted for good after KEEP_DAYS.
 * Files mode: the trimmed copy joins this session's photos and comes back
 * to be shared ("Save to Photos"); the original is marked discard, so the
 * Discards checklist reminds you to delete it in Photos.
 */
export async function saveTrim(media: Media, range: TrimRange, onProgress: Progress): Promise<File | undefined> {
  const original = await getMediaFile(media);
  const when = await trimmedTakenAt(original, media.takenAt, range.start);
  return getSource().kind === "folder"
    ? void (await trimInFolder(media, original, range, when, onProgress))
    : trimInFiles(media, original, range, when, onProgress);
}

async function trimInFolder(media: Media, original: File, range: TrimRange, when: Date, onProgress: Progress) {
  const root = getFolder().dir;
  const parts = media.path.split("/");
  const name = parts.pop()!;
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p);

  // 1. Trim into a hidden temp file next to the original (the scanner skips dot-files).
  const tmpName = `.${name}.reel-trim`;
  const tmp = await dir.getFileHandle(tmpName, { create: true });
  try {
    await trimToWritable(original, range, when, await tmp.createWritable(), onProgress);
  } catch (err) {
    await dir.removeEntry(tmpName).catch(() => {});
    throw err;
  }

  // 2. Only now does the original leave: into _reel_trash/, deleted after 30 days.
  const [moved] = await moveToTrash([media], () => {});
  // 3. The trimmed file takes the original's name.
  const final = await rename(dir, tmp as Movable, tmpName, name);

  const file = await final.getFile();
  const bin: BinEntry = {
    path: moved!.path,
    was: media.path,
    deleteAfter: new Date(Date.now() + KEEP_DAYS * 864e5).toISOString(),
  };
  await replace(media, file, media.path, when, bin);
}

async function rename(dir: FileSystemDirectoryHandle, tmp: Movable, tmpName: string, name: string) {
  if (typeof tmp.move === "function") {
    await tmp.move(name);
    return dir.getFileHandle(name);
  }
  const target = await dir.getFileHandle(name, { create: true });
  await (await tmp.getFile()).stream().pipeTo(await target.createWritable());
  await dir.removeEntry(tmpName);
  return target;
}

async function trimInFiles(media: Media, original: File, range: TrimRange, when: Date, onProgress: Progress) {
  const blob = await trimToBlob(original, range, when, onProgress);
  const dot = original.name.lastIndexOf(".");
  const name = `${original.name.slice(0, dot)}-trimmed${original.name.slice(dot)}`;
  const file = new File([blob], name, {
    type: blob.type,
    lastModified: Date.now(),
  });
  const path = (getSource() as FilesSource).put(file);
  await replace(media, file, path, when);
  return file;
}

/** The reel: the trimmed file takes over the original's record under its new id. */
async function replace(old: Media, file: File, path: string, when: Date, bin?: BinEntry) {
  const { id } = await hashFile(file);
  const s = useReel.getState();
  const reel = s.reel;
  const media = { ...reel.media };
  const next: Media = {
    ...old,
    id,
    path,
    size: file.size,
    mtime: file.lastModified,
    takenAt: when.toISOString(),
  };
  delete next.stackId;
  delete next.altPaths;
  media[id] = next;
  if (bin) delete media[old.id];
  // Files mode keeps the original (it is still in Photos), as a discard to clear out there.
  else media[old.id] = withRating(old, DISCARD);

  const series = reel.series.map((x) => ({
    ...x,
    mediaIds: x.mediaIds.map((m) => (m === old.id ? id : m)),
  }));
  const nextBin = bin ? [...(reel.bin ?? []), bin] : reel.bin;
  s.refresh({ ...reel, media, series, ...(nextBin ? { bin: nextBin } : {}) });
  useReel.setState({ currentId: id, selection: new Set() });
}
