import { FilesSource } from "@/fs/filesSource";
import { FolderSource } from "@/fs/folderSource";
import { ensurePermission, loadHandle, saveHandle } from "@/fs/handleStore";
import { scanSource } from "@/fs/scan";
import { peekSource, setSource } from "@/fs/session";
import type { Source } from "@/fs/source";

import { startAutosave } from "./persist";
import { useReel } from "./useReel";
import { showToast, useUi } from "./useUi";

let stopAutosave: (() => void) | undefined;

const onProgress = (progress: Parameters<Parameters<typeof scanSource>[2]>[0]) => useUi.getState().set({ progress });

/** Read the reel → scan → merge → show → autosave. Shared by both modes. */
async function openSource(source: Source): Promise<void> {
  const ui = useUi.getState();
  try {
    stopAutosave?.();
    setSource(source);
    ui.set({ phase: "scanning", folderName: source.name, sourceKind: source.kind, error: undefined, progress: undefined });

    const prev = await source.loadReel();
    const reel = await scanSource(source, prev, onProgress);
    useReel.getState().load(reel);
    // Started after load so that the merged scan is saved once, right away.
    stopAutosave = startAutosave();
    // A fresh object from the store's own reel (which now carries derived stackIds) — not the scan result.
    useReel.setState((s) => ({ reel: { ...s.reel } }));
    const picksFolderName = source.kind === "folder" ? (await loadHandle("picks"))?.name : undefined;
    ui.set({ phase: "ready", picksFolderName });
  } catch (err) {
    console.error(err);
    ui.set({ phase: "error", error: err instanceof Error ? err.message : String(err) });
  }
}

/** Folder mode. Must start from a user gesture (permission prompt). */
export async function openFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  if (!(await ensurePermission(handle))) {
    useUi.getState().set({ phase: "start", error: "Access to the folder was not granted." });
    return;
  }
  await saveHandle("root", handle);
  await openSource(new FolderSource(handle));
}

export async function pickAndOpen(): Promise<void> {
  try {
    const handle = await window.showDirectoryPicker({ id: "reel-source", mode: "readwrite" });
    await openFolder(handle);
  } catch (err) {
    // Closing the picker is a choice, not an error.
    if (err instanceof DOMException && err.name === "AbortError") return;
    throw err;
  }
}

/**
 * Files mode: photos handed over by the system picker. While a files library
 * is open, picking again *adds* to it — ratings of files seen before come
 * back by content hash.
 */
export async function openFiles(picked: File[]): Promise<void> {
  const ui = useUi.getState();
  const current = peekSource();
  const appending = current instanceof FilesSource && ui.phase === "ready";
  const source = appending ? current : new FilesSource();
  const added = source.add(picked);

  if (!source.size) {
    ui.set({ error: "That selection had no photos or videos." });
    return;
  }
  if (!appending) return openSource(source);

  ui.set({ phase: "scanning", progress: undefined });
  try {
    const reel = await scanSource(source, useReel.getState().reel, onProgress);
    useReel.getState().refresh(reel);
    ui.set({ phase: "ready" });
    showToast(added ? `${added} added` : "Already here — nothing new");
  } catch (err) {
    ui.set({ phase: "error", error: err instanceof Error ? err.message : String(err) });
  }
}
