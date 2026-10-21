import { ensurePermission, loadHandle, saveHandle } from "@/fs/handleStore";
import { loadReel } from "@/fs/reelFile";
import { scanFolder } from "@/fs/scan";
import { setRoot } from "@/fs/session";

import { startAutosave } from "./persist";
import { useReel } from "./useReel";
import { useUi } from "./useUi";

let stopAutosave: (() => void) | undefined;

/**
 * Open → permission → read `.reel.json` → scan → merge → autosave.
 * Must start from a user gesture (permission prompt).
 */
export async function openFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  const ui = useUi.getState();
  try {
    if (!(await ensurePermission(handle))) {
      ui.set({ phase: "start", error: "Access to the folder was not granted." });
      return;
    }
    stopAutosave?.();
    setRoot(handle);
    await saveHandle("root", handle);
    ui.set({ phase: "scanning", folderName: handle.name, error: undefined, progress: undefined });

    const prev = await loadReel(handle);
    const reel = await scanFolder(handle, prev, (progress) => useUi.getState().set({ progress }));
    useReel.getState().load(reel);
    // Started after load so that the merged scan is saved once, right away.
    stopAutosave = startAutosave();
    // A fresh object from the store's own reel (which now carries derived stackIds) — not the scan result.
    useReel.setState((s) => ({ reel: { ...s.reel } }));
    ui.set({ phase: "ready", picksFolderName: (await loadHandle("picks"))?.name });
  } catch (err) {
    console.error(err);
    ui.set({ phase: "error", error: err instanceof Error ? err.message : String(err) });
  }
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
