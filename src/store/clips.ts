import { hashFile } from "@/fs/hash";
import { freeName, namesIn } from "@/fs/names";
import { getFolder, getMediaFile, getSource } from "@/fs/session";
import type { SessionFiles, Source } from "@/fs/source";
import { trimToBlob, trimToWritable, trimmedTakenAt, type TrimRange } from "@/fs/trimVideo";
import { clipFileName, clipRating, inOrder } from "@/trim/clips";
import { DISCARD, type Media } from "@/types";

import { withFileLock } from "./discards";
import { saveNow } from "./persist";
import { useReel, withRating } from "./useReel";

type Progress = (fraction: number) => void;
type Made = { id: string; file: File; path: string; when: Date };
export type ClipsOutcome = { kind: "saved"; count: number } | { kind: "share"; files: File[] };

/**
 * Several clips out of one video (UC-007). Each clip is a new video of its
 * own — next to the original in a folder, handed to the share sheet in files
 * mode — with its real time (so it lands in the right spot on the timeline)
 * and the original's tags, place and series. The original stays, or is rated
 * "delete" and leaves the usual way: countdown, then Recently deleted.
 *
 * One clip with the original not kept is the plain trim (saveTrim), which
 * replaces the file under its own name; this is for everything else. A
 * folder left as it is never gets here: it may not write files, and one
 * remembered trim per video is all it can apply on export.
 */
export async function saveClips(media: Media, ranges: TrimRange[], keepOriginal: boolean, onProgress: Progress): Promise<ClipsOutcome> {
  const clips = inOrder(ranges);
  const original = await getMediaFile(media);
  if (getSource().kind !== "folder") {
    const made: Made[] = [];
    for (const [i, range] of clips.entries()) {
      const when = await trimmedTakenAt(original, media.takenAt, range.start);
      const blob = await trimToBlob(original, range, when, (p) => onProgress((i + p) / clips.length));
      const file = new File([blob], clipFileName(original.name, i + 1, clips.length), { type: blob.type, lastModified: Date.now() });
      const path = (getSource() as Source & SessionFiles).put(file);
      made.push({ id: (await hashFile(file)).id, file, path, when });
    }
    addClips(media, made, keepOriginal);
    return { kind: "share", files: made.map((m) => m.file) };
  }
  // Reserved, so the discard sweep cannot move the original while clips are read out of it.
  const made = await withFileLock(media.id, () => writeClips(media, original, clips, onProgress));
  addClips(media, made, keepOriginal);
  await saveNow();
  return { kind: "saved", count: made.length };
}

/** Folder: each clip is written next to the original under a free name; a failure removes the ones written so far. */
async function writeClips(media: Media, original: File, clips: TrimRange[], onProgress: Progress): Promise<Made[]> {
  const parts = media.path.split("/");
  const name = parts.pop()!;
  let dir = getFolder().dir;
  for (const p of parts) dir = await dir.getDirectoryHandle(p);
  const taken = await namesIn(dir);
  const written: string[] = [];
  const made: Made[] = [];
  try {
    for (const [i, range] of clips.entries()) {
      const fileName = freeName(clipFileName(name, i + 1, clips.length), (c) => taken.has(c));
      taken.add(fileName);
      written.push(fileName);
      const when = await trimmedTakenAt(original, media.takenAt, range.start);
      const handle = await dir.getFileHandle(fileName, { create: true });
      await trimToWritable(original, range, when, await handle.createWritable(), (p) => onProgress((i + p) / clips.length));
      const file = await handle.getFile();
      made.push({ id: (await hashFile(file)).id, file, path: [...parts, fileName].join("/"), when });
    }
  } catch (err) {
    for (const n of written) await dir.removeEntry(n).catch(() => {});
    throw err;
  }
  return made;
}

/** The clips join the library where the original was — in every series too. */
function addClips(old: Media, made: Made[], keepOriginal: boolean) {
  const s = useReel.getState();
  const reel = s.reel;
  const base: Media = { ...old, rating: clipRating(old.rating), exportedTo: [] };
  for (const k of ["stackId", "altPaths", "trim", "binned", "discardedAt", "missing"] as const) delete base[k];
  const media = { ...reel.media };
  const ids: string[] = [];
  for (const m of made) {
    if (ids.includes(m.id)) continue; // two identical clips are one file's worth
    ids.push(m.id);
    media[m.id] = { ...base, id: m.id, path: m.path, size: m.file.size, mtime: m.file.lastModified, takenAt: m.when.toISOString() };
  }
  media[old.id] = keepOriginal ? old : withRating(old, DISCARD);
  const series = reel.series.map((x) => ({
    ...x,
    mediaIds: x.mediaIds.flatMap((id) => (id === old.id ? (keepOriginal ? [id, ...ids] : ids) : [id])),
  }));
  s.refresh({ ...reel, media, series });
  useReel.setState({ currentId: ids[0], selection: new Set() });
}
