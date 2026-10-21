import { binUntil } from "@/fs/deletion";
import { FilesSource } from "@/fs/filesSource";
import { hashFile } from "@/fs/hash";
import { getFolder, getMediaFile, getSource } from "@/fs/session";
import { moveFile, moveToTrash } from "@/fs/trash";
import { trimToBlob, trimToWritable, trimmedTakenAt, type TrimRange } from "@/fs/trimVideo";
import { DISCARD, type Media } from "@/types";

import { editsInPlace } from "./discards";
import { saveNow } from "./persist";
import { useReel, withRating } from "./useReel";

type Progress = (fraction: number) => void;
type Renamable = FileSystemFileHandle & { move?: (name: string) => Promise<void> };
export type TrimOutcome = { kind: "replaced" } | { kind: "noted" } | { kind: "share"; file: File };

/**
 * Saving a trim — what happens depends on how the folder is worked on.
 *
 * Folder, edited in place: the trimmed file takes the original's name; the
 * original goes to "Recently deleted" (`_reel_trash/`, gone after 30 days).
 * Folder, left as it is: nothing on disk changes; the trim is kept as a
 * decision and applied when the result is exported.
 * Files mode: the trimmed copy is handed back to be shared ("Save to
 * Photos"); the original becomes a discard.
 *
 * The trimmed video takes over the original's record — rating, tags, place,
 * series — under its new content id.
 */
export async function saveTrim(media: Media, range: TrimRange, onProgress: Progress): Promise<TrimOutcome> {
  if (getSource().kind === "folder" && !editsInPlace()) {
    useReel.getState().patch([media.id], (m) => ({ ...m, trim: range }));
    return { kind: "noted" };
  }
  const original = await getMediaFile(media);
  const when = await trimmedTakenAt(original, media.takenAt, range.start);
  if (getSource().kind === "folder") {
    await trimInPlace(media, original, range, when, onProgress);
    return { kind: "replaced" };
  }
  return { kind: "share", file: await trimForSharing(media, original, range, when, onProgress) };
}

async function trimInPlace(media: Media, original: File, range: TrimRange, when: Date, onProgress: Progress) {
  const root = getFolder().dir;
  const parts = media.path.split("/");
  const name = parts.pop()!;
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p);

  // 1. Trim into a hidden temp file next to the original (the scanner skips dot-files).
  const tmpName = `.${name}.reel-trim`;
  const tmp = (await dir.getFileHandle(tmpName, { create: true })) as Renamable;
  const dropTmp = () => dir.removeEntry(tmpName).catch(() => {});
  try {
    await trimToWritable(original, range, when, await tmp.createWritable(), onProgress);
  } catch (err) {
    await dropTmp();
    throw err;
  }
  const { id } = await hashFile(await tmp.getFile()).catch(async (err) => {
    await dropTmp();
    throw err;
  });

  // 2. Only now does the original leave — and comes back if anything after this fails.
  const taken = new Set(
    Object.values(useReel.getState().reel.media).flatMap((m) => (m.binned?.path ? [m.binned.path] : [])),
  );
  const parked = await moveToTrash(root, media.path, taken);
  let file: File;
  try {
    await rename(dir, tmp, tmpName, name);
    file = await (await dir.getFileHandle(name)).getFile();
  } catch (err) {
    await moveFile(root, parked, media.path).catch(() => {});
    await dropTmp();
    throw err;
  }

  // 3. The reel, saved at once: the trimmed file and where the original went.
  const old = withRating({ ...media, binned: { path: parked, until: binUntil() } }, DISCARD);
  takeOver(media, { id, file, path: media.path, when }, old);
  await saveNow();
}

async function rename(dir: FileSystemDirectoryHandle, tmp: Renamable, tmpName: string, name: string) {
  if (typeof tmp.move === "function") return tmp.move(name);
  const target = await dir.getFileHandle(name, { create: true });
  await (await tmp.getFile()).stream().pipeTo(await target.createWritable());
  await dir.removeEntry(tmpName);
}

async function trimForSharing(media: Media, original: File, range: TrimRange, when: Date, onProgress: Progress) {
  const blob = await trimToBlob(original, range, when, onProgress);
  const dot = original.name.lastIndexOf(".");
  const name = `${original.name.slice(0, dot)}-trimmed${original.name.slice(dot)}`;
  const file = new File([blob], name, { type: blob.type, lastModified: Date.now() });
  const { id } = await hashFile(file);
  const path = (getSource() as FilesSource).put(file);
  // The original is still in Photos: a discard, so the checklist says to delete it there.
  takeOver(media, { id, file, path, when }, withRating(media, DISCARD));
  return file;
}

/** The trimmed file takes over the original's record (and its place in every series). */
function takeOver(old: Media, next: { id: string; file: File; path: string; when: Date }, oldAfter: Media) {
  const s = useReel.getState();
  const reel = s.reel;
  const fresh: Media = {
    ...old,
    id: next.id,
    path: next.path,
    size: next.file.size,
    mtime: next.file.lastModified,
    takenAt: next.when.toISOString(),
  };
  for (const k of ["stackId", "altPaths", "trim", "binned", "discardedAt", "missing"] as const) delete fresh[k];
  const media = { ...reel.media, [next.id]: fresh, [old.id]: oldAfter };
  const series = reel.series.map((x) => ({ ...x, mediaIds: x.mediaIds.map((m) => (m === old.id ? next.id : m)) }));
  s.refresh({ ...reel, media, series });
  useReel.setState({ currentId: next.id, selection: new Set() });
}
