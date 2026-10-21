import { CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";

import { exportName, exportSeries } from "@/fs/exportSeries";
import { getMediaFile, getSource } from "@/fs/session";
import { renamed, shareFiles } from "@/fs/share";
import { useReel } from "@/store/useReel";
import type { Series } from "@/types";

export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string };

/**
 * Folder mode: pick a target folder, copy the series into it.
 * Files mode: hand the series to the share sheet, named 01_…, 02_….
 * Either way `exportedTo` records it.
 */
export function useExport() {
  const [state, setState] = useState<ExportState>({ kind: "idle" });

  const run = async (series: Series) => {
    const { reel, markExported } = useReel.getState();
    const media = series.mediaIds.flatMap((id) => {
      const m = reel.media[id];
      return m && !m.missing ? [m] : [];
    });
    const absent = series.mediaIds.length - media.length;
    const files = getSource().kind === "files";
    // Never report an export that did not happen. In files mode, photos not
    // added again this session cannot be shared — and a partial share would
    // be numbered 01…03 for a series of 12, so refuse rather than guess.
    if (!media.length || (files && absent)) {
      setState({
        kind: "error",
        message: files
          ? `${absent} of ${series.mediaIds.length} photos aren’t loaded right now — add them again, then share.`
          : "None of these files are in the folder any more.",
      });
      return;
    }
    const ids = media.map((m) => m.id);
    if (files) {
      try {
        const files = await Promise.all(
          media.map(async (m, i) => renamed(await getMediaFile(m), exportName(i, media.length, m.path))),
        );
        const result = await shareFiles(files, series.title);
        if (result === "cancelled") return;
        const path = result === "shared" ? "shared" : "downloads";
        markExported(series.id, path, ids);
        setState({ kind: "done", path });
      } catch (err) {
        setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      }
      return;
    }
    let target: FileSystemDirectoryHandle;
    try {
      target = await window.showDirectoryPicker({ id: "reel-export", mode: "readwrite" });
    } catch {
      return; // picker closed
    }
    setState({ kind: "running", done: 0, total: media.length });
    try {
      const path = await exportSeries(target, series.title, media, (done) =>
        setState({ kind: "running", done, total: media.length }),
      );
      // Only what was copied — files missing from the folder were not.
      markExported(series.id, path, ids);
      setState({ kind: "done", path });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  return { state, run };
}

export function ExportStatus({ state }: { state: ExportState }) {
  if (state.kind === "running") {
    const pct = state.total ? (state.done / state.total) * 100 : 0;
    return (
      <div className="export-status" aria-live="polite">
        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-2 tabular">
          Copying {state.done} of {state.total}…
        </span>
      </div>
    );
  }
  if (state.kind === "done")
    return (
      <p className="export-status success-text" aria-live="polite">
        <CircleCheck size={15} aria-hidden="true" />
        {state.path === "shared" ? "Shared" : state.path === "downloads" ? "Downloaded" : <>Exported to <code>{state.path}</code></>}
      </p>
    );
  if (state.kind === "error")
    return (
      <p className="export-status error-text" role="alert">
        <CircleAlert size={15} aria-hidden="true" /> Export failed: {state.message}
      </p>
    );
  return null;
}
