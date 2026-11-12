import { Eye, FolderOutput, Layers, Share } from "lucide-react";

import { locale, t, tn } from "@/i18n";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Series } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";
import { Kbd } from "@/ui/kit/Kbd";

import { MiniThumb } from "./MiniThumb";
import { ExportStatus, useExport } from "./useExport";

const WHEN = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

export function SeriesListDialog() {
  const open = useUi((s) => s.dialog === "seriesList");
  const series = useReel((s) => s.reel.series);
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title={t("Series")} subtitle={series.length ? t("{n} saved", { n: series.length }) : undefined} wide>
      {series.length === 0 ? (
        <div className="empty-state">
          <Layers size={28} aria-hidden="true" />
          <strong>{t("No series yet")}</strong>
          <p>
            {t("Select a few items —")} <Kbd>Shift</Kbd> + <Kbd>→</Kbd> {t("or")} <Kbd>⌘/Ctrl</Kbd> {t("+ click — and press")}{" "}
            <Kbd>S</Kbd>.
          </p>
        </div>
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
  const share = useUi((s) => s.sourceKind === "files");
  const items = series.mediaIds.flatMap((id) => (media[id] ? [media[id]] : []));

  const show = () => {
    const present = items.filter((m) => !m.missing);
    if (!present[0]) return;
    useReel.getState().setCurrent(present[0].id);
    useReel.setState({ selection: new Set(present.map((m) => m.id)) });
    onShow();
  };

  return (
    <li className="series-row">
      <div className="series-cover">{items[0] && <MiniThumb media={items[0]} />}</div>
      <div className="series-main">
        <strong>{series.title}</strong>
        <span className="text-3">
          {tn("1 item", "{n} items", items.length)} · {WHEN.format(new Date(series.createdAt))}
          {series.exportedPath && <> · {exportedText(series.exportedPath)}</>}
        </span>
        <div className="thumb-strip is-small">
          {items.slice(1, 12).map((m) => (
            <MiniThumb key={m.id} media={m} />
          ))}
          {items.length > 12 && <span className="text-3">+{items.length - 12}</span>}
        </div>
        <ExportStatus state={state} />
      </div>
      <div className="series-actions">
        <Button size="sm" icon={Eye} onClick={show}>
          {t("Show")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={share ? Share : FolderOutput}
          onClick={() => void run(series)}
          disabled={state.kind === "running"}
        >
          {share ? t("Share") : series.exportedPath ? t("Export again") : t("Export")}
        </Button>
      </div>
    </li>
  );
}

/** Where a series went: "shared" and "downloads" are markers, anything else a folder path. */
function exportedText(path: string): string {
  if (path === "shared") return t("shared");
  if (path === "downloads") return t("downloaded");
  return t("exported to {path}", { path });
}
