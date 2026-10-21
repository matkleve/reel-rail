import { CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";

import { exportSeries } from "@/fs/exportSeries";
import { useReel } from "@/store/useReel";
import type { Series } from "@/types";

export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string };

/** Pick a target folder, copy the series into it, record `exportedTo`. */
export function useExport() {
  const [state, setState] = useState<ExportState>({ kind: "idle" });

  const run = async (series: Series) => {
    const { reel, markExported } = useReel.getState();
    const media = series.mediaIds.flatMap((id) => {
      const m = reel.media[id];
      return m && !m.missing ? [m] : [];
    });
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
      markExported(series.id, path);
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
        <CircleCheck size={15} aria-hidden="true" /> Exported to <code>{state.path}</code>
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
