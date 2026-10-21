import { exportResult } from "@/fs/exportResult";
import { folderName } from "@/fs/exportSeries";
import { DISCARD } from "@/types";

import { useReel } from "./useReel";
import { showToast, useUi } from "./useUi";

/** "Export result…": everything kept, trims applied, into a new folder the user picks a place for. */
export async function runExportResult(): Promise<void> {
  const { reel, order } = useReel.getState();
  const kept = order.map((id) => reel.media[id]!).filter((m) => m.rating !== DISCARD);
  if (!kept.length) return showToast("Nothing kept yet");
  let target: FileSystemDirectoryHandle;
  try {
    target = await window.showDirectoryPicker({ id: "reel-export", mode: "readwrite" });
  } catch {
    return; // picker closed
  }
  const name = folderName(`${useUi.getState().folderName ?? "Trip"} – sorted`);
  try {
    const path = await exportResult(target, name, kept, (done) => showToast(`Exporting ${done} of ${kept.length}…`));
    showToast(`Exported ${kept.length} to ${path}`);
  } catch (err) {
    showToast(`Export stopped: ${err instanceof Error ? err.message : err}`, "error");
  }
}
