import { Dices, FolderOutput } from "lucide-react";
import { useMemo, useState } from "react";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Media, Series } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

import { MiniThumb } from "./MiniThumb";
import { funnyTitle, suggestTitle } from "./titles";
import { ExportStatus, useExport, type ExportState } from "./useExport";

/** Title the selection, save it as a series, optionally export it right away. */
export function CreateSeriesDialog() {
  const open = useUi((s) => s.dialog === "createSeries");
  return open ? <CreateSeries onDone={() => useUi.getState().set({ dialog: null })} /> : null;
}

function CreateSeries({ onDone }: { onDone(): void }) {
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
    <Dialog
      open
      onClose={onDone}
      title={created ? "Series created" : "New series"}
      subtitle={`${media.length} items · saved in .reel.json — files are only copied when you export`}
      wide
      footer={
        <SeriesFooter
          created={created}
          exporting={state.kind}
          onCancel={onDone}
          onCreateAndExport={() => void run(create())}
          onExport={() => created && void run(created)}
        />
      }
    >
      <form
        id="series-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!created) create();
        }}
      >
        <label className="field-label" htmlFor="series-title">
          Title
        </label>
        <div className="title-row">
          <input
            id="series-title"
            className="input input-lg"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Series title"
            disabled={!!created}
            data-autofocus
          />
          <Button
            variant="secondary"
            size="lg"
            icon={Dices}
            label="Roll a funny title"
            onClick={() => setTitle(funnyTitle(media))}
            disabled={!!created}
          />
        </div>
      </form>
      <div className="thumb-strip">
        {media.map((m) => (
          <MiniThumb key={m.id} media={m} />
        ))}
      </div>
      <ExportStatus state={state} />
    </Dialog>
  );
}

type FooterProps = {
  created?: Series;
  exporting: ExportState["kind"];
  onCancel(): void;
  onCreateAndExport(): void;
  onExport(): void;
};

/**
 * Distinct keys per state: React must not reuse the clicked button as the new
 * one mid-click (docs/TRAPS.md § a button that changes type).
 */
function SeriesFooter(p: FooterProps) {
  if (!p.created)
    return (
      <div className="footer-row" key="draft">
        <Button variant="ghost" onClick={p.onCancel}>
          Cancel
        </Button>
        <span className="spacer" />
        <Button variant="secondary" icon={FolderOutput} onClick={p.onCreateAndExport}>
          Create & export…
        </Button>
        <Button variant="primary" type="submit" form="series-form">
          Create series
        </Button>
      </div>
    );
  return (
    <div className="footer-row" key="created">
      <span className="spacer" />
      {p.exporting === "idle" && (
        <Button variant="secondary" icon={FolderOutput} onClick={p.onExport}>
          Export…
        </Button>
      )}
      <Button variant="primary" onClick={p.onCancel} disabled={p.exporting === "running"}>
        Done
      </Button>
    </div>
  );
}
