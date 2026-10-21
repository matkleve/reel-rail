import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Series } from "@/types";
import { Dialog } from "@/ui/Dialog";

import { MiniThumb } from "./MiniThumb";
import { ExportStatus, useExport } from "./useExport";

const WHEN = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function SeriesListDialog() {
  const open = useUi((s) => s.dialog === "seriesList");
  const series = useReel((s) => s.reel.series);
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Series"
      wide
      footer={
        <button className="btn btn-primary" onClick={close}>
          Close
        </button>
      }
    >
      {series.length === 0 ? (
        <p className="muted">
          No series yet. Select media on the timeline (Shift + ← / → or Ctrl/⌘ + click) and press <kbd>S</kbd>.
        </p>
      ) : (
        <ul className="series-list">
          {[...series].reverse().map((s) => (
            <SeriesRow key={s.id} series={s} onShow={close} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function SeriesRow({ series, onShow }: { series: Series; onShow(): void }) {
  const media = useReel((s) => s.reel.media);
  const { state, run } = useExport();
  const items = series.mediaIds.flatMap((id) => (media[id] ? [media[id]] : []));

  const show = () => {
    const s = useReel.getState();
    const first = items.find((m) => !m.missing);
    if (!first) return;
    s.setCurrent(first.id);
    useReel.setState({ selection: new Set(items.filter((m) => !m.missing).map((m) => m.id)) });
    onShow();
  };

  return (
    <li className="series-row">
      <div className="series-head">
        <strong>{series.title}</strong>
        <span className="muted small">
          {items.length} items · {WHEN.format(new Date(series.createdAt))}
          {series.exportedPath && <> · exported to <code>{series.exportedPath}</code></>}
        </span>
      </div>
      <div className="mini-strip">
        {items.slice(0, 14).map((m) => (
          <MiniThumb key={m.id} media={m} />
        ))}
        {items.length > 14 && <span className="muted small">+{items.length - 14}</span>}
      </div>
      <div className="series-actions">
        <button className="btn btn-ghost" onClick={show}>
          Show on timeline
        </button>
        <button className="btn btn-ghost" onClick={() => void run(series)} disabled={state.kind === "running"}>
          {series.exportedPath ? "Export again…" : "Export…"}
        </button>
      </div>
      <ExportStatus state={state} />
    </li>
  );
}
