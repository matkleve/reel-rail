import { DEFAULT_TAG_PRESETS, emptyReel, type ReelFile } from "@/types";

export const REEL_NAME = ".reel.json";
export const REEL_TMP = ".reel.tmp.json";

async function readJson(dir: FileSystemDirectoryHandle, name: string): Promise<ReelFile | undefined> {
  try {
    const file = await (await dir.getFileHandle(name)).getFile();
    return normalize(JSON.parse(await file.text()));
  } catch {
    return undefined;
  }
}

/**
 * Tolerates hand-edited or older files: missing collections become empty,
 * version 1 is migrated. A version this code does not know is refused rather
 * than guessed at — saving it back would destroy whatever it means.
 */
export function normalize(raw: unknown, now = new Date()): ReelFile {
  const r = (raw ?? {}) as Omit<Partial<ReelFile>, "version"> & { version?: number };
  const version = r.version ?? 2;
  if (version !== 1 && version !== 2) throw new Error(`Unsupported .reel.json version ${r.version}`);
  const media = r.media ?? {};
  for (const m of Object.values(media)) {
    m.tags ??= [];
    m.exportedTo ??= [];
    m.rating ??= 0;
    // v1 had four levels; its bottom one ("unusable") is v2's "discard".
    if (version === 1 && m.rating === -1) m.rating = -2;
    // Discards from before the 30-day rule get their full 30 days from now —
    // never deleted on the day the rule first meets them.
    if (m.rating === -2 && !m.discardedAt) m.discardedAt = now.toISOString();
  }
  return {
    version: 2,
    media,
    series: r.series ?? [],
    tagPresets: r.tagPresets?.length ? r.tagPresets : [...DEFAULT_TAG_PRESETS],
    ...(r.bin?.length ? { bin: r.bin } : {}),
  };
}

/**
 * Reads `.reel.json`. If it is missing or torn, falls back to the temp copy —
 * the write order in `saveReel` guarantees at least one of them is whole.
 */
export async function loadReel(dir: FileSystemDirectoryHandle): Promise<ReelFile> {
  return (await readJson(dir, REEL_NAME)) ?? (await readJson(dir, REEL_TMP)) ?? emptyReel();
}

async function writeText(dir: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}

/**
 * Atomic save: write the full content to `.reel.tmp.json` first, then replace
 * `.reel.json`, then drop the temp file.
 *
 * There is no portable rename in the File System Access API (`move()` is not
 * available everywhere and refuses to overwrite in some versions). Chrome
 * already commits `createWritable()` through a swap file on `close()`, so a
 * torn `.reel.json` is unlikely — the temp file covers the remaining case of
 * a crash between the two writes, and `loadReel` knows to read it.
 */
export async function saveReel(dir: FileSystemDirectoryHandle, reel: ReelFile): Promise<void> {
  const text = JSON.stringify(reel, null, 1);
  await writeText(dir, REEL_TMP, text);
  await writeText(dir, REEL_NAME, text);
  try {
    await dir.removeEntry(REEL_TMP);
  } catch {
    // Harmless: loadReel prefers .reel.json, and the next save overwrites it.
  }
}
