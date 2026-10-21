import { useMemo, useState } from "react";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Media, Series } from "@/types";
import { Dialog } from "@/ui/Dialog";
import { DiceIcon } from "@/ui/icons";

import { MiniThumb } from "./MiniThumb";
import { funnyTitle, suggestTitle } from "./titles";
import { ExportStatus, useExport, type ExportState } from "./useExport";

/** Title the selection, save it as a virtual series, optionally export it right away. */
export function CreateSeriesDialog() {
  const open = useUi((s) => s.dialog === "createSeries");
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title="Create series" wide>
      {open && <CreateSeriesBody onDone={close} />}
    </Dialog>
  );
}

function CreateSeriesBody({ onDone }: { onDone(): void }) {
  const media = useMemo(() => {
    const { selection, order, reel } = useReel.getState();
    // Series keep timeline order, whatever order things were clicked in.
    return order.flatMap((id): Media[] => (selection.has(id) && reel.media[id] ? [reel.media[id]] : []));
  }, []);
  const [title, setTitle] = useState(() => suggestTitle(media));
  const [created, setCreated] = useState<Series>();
  const { state, run } = useExport();

  const create = () => {
    const series: Series = {
      id: crypto.randomUUID(),
      title: title.trim() || suggestTitle(media),
      mediaIds: media.map((m) => m.id),
      createdAt: new Date().toISOString(),
    };
    useReel.getState().addSeries(series);
    setCreated(series);
    return series;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!created) create();
      }}
    >
      <div className="title-row">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Series title"
          disabled={!!created}
          autoFocus
        />
        <button
          type="button"
          className="btn btn-ghost icon"
          onClick={() => setTitle(funnyTitle(media))}
          aria-label="Roll a funny title"
          title="Roll a funny title"
          disabled={!!created}
        >
          <DiceIcon />
        </button>
      </div>
      <div className="mini-strip">
        {media.map((m) => (
          <MiniThumb key={m.id} media={m} />
        ))}
      </div>
      <p className="muted small">
        {media.length} items · saved in <code>.reel.json</code> — files are only copied when you export.
      </p>
      <ExportStatus state={state} />
      <Footer
        created={!!created}
        exporting={state.kind}
        onDone={onDone}
        onCreateAndExport={() => void run(create())}
        onExport={() => created && void run(created)}
      />
    </form>
  );
}

type FooterProps = {
  created: boolean;
  exporting: ExportState["kind"];
  onDone(): void;
  onCreateAndExport(): void;
  onExport(): void;
};

/**
 * The two footers carry different keys on purpose. Without them React reuses
 * the clicked "Create & export" <button> as the new type="submit" "Done"
 * button during the click — and the browser then runs the submit default on
 * it, closing the dialog mid-export. (docs/TRAPS.md)
 */
function Footer(p: FooterProps) {
  if (!p.created)
    return (
      <div className="dialog-footer" key="draft">
        <button type="button" className="btn btn-ghost" onClick={p.onDone}>
          Cancel
        </button>
        <button type="button" className="btn btn-ghost" onClick={p.onCreateAndExport}>
          Create & export…
        </button>
        <button type="submit" className="btn btn-primary">
          Create
        </button>
      </div>
    );
  return (
    <div className="dialog-footer" key="created">
      {p.exporting === "idle" && (
        <button type="button" className="btn btn-ghost" onClick={p.onExport}>
          Export…
        </button>
      )}
      <button type="button" className="btn btn-primary" onClick={p.onDone} disabled={p.exporting === "running"}>
        Done
      </button>
    </div>
  );
}
