import { ArchiveRestore, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { daysLeft } from "@/fs/deletion";
import { formatBytes } from "@/fs/trash";
import { t, tn } from "@/i18n";
import { MiniThumb } from "@/series/MiniThumb";
import { deleteNow, restore } from "@/store/discards";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { KEEP_DAYS, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

/**
 * "Recently deleted": discards whose countdown ran out. Tap one to bring it
 * back. In a folder edited in place the files wait in `_reel_trash/` and are
 * deleted for good after KEEP_DAYS — or now, on a confirmed "Delete now".
 */
export function CleanupDialog() {
  const open = useUi((s) => s.dialog === "cleanup");
  return open ? <Cleanup onDone={() => useUi.getState().set({ dialog: null })} /> : null;
}

function Cleanup({ onDone }: { onDone(): void }) {
  const media = useReel((s) => s.reel.media);
  const workflow = useReel((s) => s.reel.workflow);
  const kind = useUi((s) => s.sourceKind);
  const items = useMemo(
    () =>
      Object.values(media)
        .filter((m) => m.binned)
        .sort((a, b) => a.takenAt.localeCompare(b.takenAt)),
    [media],
  );
  const onDisk = items.filter((m) => m.binned?.path);
  const bytes = onDisk.reduce((n, m) => n + (m.size ?? 0), 0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await deleteNow(onDisk.map((m) => m.id));
      showToast(tn("Deleted 1 file · {size} freed", "Deleted {n} files · {size} freed", r.count, { size: formatBytes(r.bytes) }));
      if (r.failed) showToast(tn("1 file could not be deleted", "{n} files could not be deleted", r.failed), "error");
      onDone();
    } catch (err) {
      showToast(t("Deleting stopped: {error}", { error: err instanceof Error ? err.message : String(err) }), "error");
      setBusy(false);
    }
  };

  const note =
    kind === "files"
      ? t("A browser can’t delete from your photo library: use this list to clear them out in the Photos app.")
      : workflow === "export"
        ? t("This folder is left as it is — these are just not part of the export.")
        : t("Moved to _reel_trash/ and deleted for good after {days} days.", { days: KEEP_DAYS });

  return (
    <Dialog
      open
      onClose={onDone}
      title={t("Recently deleted")}
      subtitle={
        items.length
          ? `${tn("1 item", "{n} items", items.length)}${onDisk.length ? ` · ${formatBytes(bytes)}` : ""}`
          : undefined
      }
      wide
      footer={
        onDisk.length ? (
          <DeleteFooter
            count={onDisk.length}
            bytes={bytes}
            busy={busy}
            confirming={confirming}
            onConfirm={setConfirming}
            onRun={() => void run()}
          />
        ) : items.length ? (
          <span className="note">{note}</span>
        ) : undefined
      }
    >
      {!items.length ? (
        <div className="empty-state">
          <Trash2 size={28} aria-hidden="true" />
          <strong>{t("Nothing deleted")}</strong>
          <p>{t("Throw a photo down (or rate it Delete): a bar runs out, and it lands here.")}</p>
        </div>
      ) : (
        <>
          <p className="note">{onDisk.length ? `${note} ${t("Tap one to bring it back.")}` : t("Tap one to bring it back.")}</p>
          <div className="cleanup-grid">
            {items.map((m) => (
              <Tile key={m.id} media={m} disabled={busy} />
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

function Tile({ media: m, disabled }: { media: Media; disabled: boolean }) {
  const days = m.binned?.path ? daysLeft(m) : undefined;
  return (
    <button
      type="button"
      className="cleanup-tile"
      title={t("{path} — bring back", { path: m.path })}
      disabled={disabled}
      onClick={() => void restore(m.id)}
    >
      <MiniThumb media={m} />
      {days !== undefined && <span className="cleanup-days tabular">{days === 0 ? t("today") : t("{n} d", { n: days })}</span>}
      <span className="cleanup-keep">
        <ArchiveRestore size={16} /> {t("Bring back")}
      </span>
    </button>
  );
}

type FooterProps = {
  count: number;
  bytes: number;
  busy: boolean;
  confirming: boolean;
  onConfirm(v: boolean): void;
  onRun(): void;
};

/** Idle → confirm → busy. Keys keep React from reusing the clicked button across states. */
function DeleteFooter(p: FooterProps) {
  if (p.busy) return <span className="text-2">{t("Deleting…")}</span>;
  if (p.confirming)
    return (
      <div className="footer-row" key="confirm">
        <span className="text-2">
          {tn(
            "Delete 1 file ({size}) for good? This can’t be undone.",
            "Delete {n} files ({size}) for good? This can’t be undone.",
            p.count,
            { size: formatBytes(p.bytes) },
          )}
        </span>
        <span className="spacer" />
        <Button variant="ghost" onClick={() => p.onConfirm(false)}>
          {t("Cancel")}
        </Button>
        <Button variant="danger" icon={Trash2} onClick={p.onRun} autoFocus>
          {tn("Delete 1 file", "Delete {n} files", p.count)}
        </Button>
      </div>
    );
  return (
    <div className="footer-row" key="idle">
      <span className="note">{t("Don’t want to wait {days} days?", { days: KEEP_DAYS })}</span>
      <span className="spacer" />
      <Button variant="primary" icon={Trash2} onClick={() => p.onConfirm(true)}>
        {t("Delete now…")}
      </Button>
    </div>
  );
}
