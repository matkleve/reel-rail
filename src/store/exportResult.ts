import { exportResult } from "@/fs/exportResult";
import { folderName } from "@/fs/exportSeries";
import { t } from "@/i18n";
import { DISCARD } from "@/types";

import { useReel } from "./useReel";
import { showToast, useUi } from "./useUi";

/** "Export result…": everything kept, trims applied, into a new folder the user picks a place for. */
export async function runExportResult(): Promise<void> {
  const { reel, order } = useReel.getState();
  const kept = order.map((id) => reel.media[id]!).filter((m) => m.rating !== DISCARD);
  if (!kept.length) return showToast(t("Nothing kept yet"));
  let target: FileSystemDirectoryHandle;
  try {
    target = await window.showDirectoryPicker({ id: "reel-export", mode: "readwrite" });
  } catch {
    return; // picker closed
  }
  const name = folderName(t("{folder} – sorted", { folder: useUi.getState().folderName ?? t("Trip") }));
  try {
    const path = await exportResult(target, name, kept, (done) =>
      showToast(t("Exporting {done} of {total}…", { done, total: kept.length })),
    );
    showToast(t("Exported {n} to {path}", { n: kept.length, path }));
  } catch (err) {
    showToast(t("Export stopped: {error}", { error: err instanceof Error ? err.message : String(err) }), "error");
  }
}
