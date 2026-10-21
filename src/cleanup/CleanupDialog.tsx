import { ArchiveRestore, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { daysLeft } from "@/fs/deletion";
import { formatBytes } from "@/fs/trash";
import { MiniThumb } from "@/series/MiniThumb";
import { deleteNow } from "@/store/deletion";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { DISCARD, KEEP_DAYS, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

/**
 * Everything rated "discard" — reel-rail's "Recently deleted". In folder mode
 * each file is deleted for good KEEP_DAYS after it was discarded, or now on
 * a confirmed "Delete now". Tapping a tile keeps it.
 */
export function CleanupDialog() {
  const open = useUi((s) => s.dialog === "cleanup");
  return open ? <Cleanup onDone={() => useUi.getState().set({ dialog: null })} /> : null;
}

function Cleanup({ onDone }: { onDone(): void }) {
  const order = useReel((s) => s.order);
  const media = useReel((s) => s.reel.media);
  const items = useMemo(
    () => order.flatMap((id): Media[] => (media[id]!.rating === DISCARD ? [media[id]!] : [])),
    [order, media],
  );
  const bytes = items.reduce((n, m) => n + (m.size ?? 0), 0);
  const [confirming, setConfirming] = useState(false);
  // Files mode has read-only access: nothing can be deleted, so this is a checklist.
  const canDelete = useUi((s) => s.sourceKind === "folder");
  const [done, setDone] = useState<number>();
  const total = items.reduce((n, m) => n + 1 + (m.altPaths?.length ?? 0), 0);

  const run = async () => {
    setDone(0);
    try {
      const r = await deleteNow(items, setDone);
      showToast(`Deleted ${r.count} ${r.count === 1 ? "file" : "files"} · ${formatBytes(r.bytes)} freed`);
      if (r.failed) showToast(`${r.failed} files could not be deleted`, "error");
      onDone();
    } catch (err) {
      showToast(`Deleting stopped: ${err instanceof Error ? err.message : err}`, "error");
      setDone(undefined);
    }
  };

  return (
    <Dialog
      open
      onClose={onDone}
      title="Discards"
      subtitle={
        items.length ? `${items.length} ${items.length === 1 ? "item" : "items"} · ${formatBytes(bytes)}` : undefined
      }
      wide
      footer={
        items.length && !canDelete ? (
          <span className="note">
            A browser can’t delete from your photo library. Use this list to clear them out in the Photos app — or keep
            them; they stay marked.
          </span>
        ) : items.length ? (
          <CleanupFooter
            count={items.length}
            bytes={bytes}
            done={done}
            total={total}
            confirming={confirming}
            onConfirm={setConfirming}
            onRun={() => void run()}
          />
        ) : undefined
      }
    >
      {!items.length ? (
        <div className="empty-state">
          <Trash2 size={28} aria-hidden="true" />
          <strong>Nothing marked as discard</strong>
          <p>Swipe down or press ↓ on a weak shot, or tap the bin in the dock.</p>
        </div>
      ) : (
        <>
          <p className="note">
            {canDelete
              ? `Discards are deleted for good ${KEEP_DAYS} days after you discarded them. Tap one to keep it after all.`
              : "Tap one to keep it after all — it goes back to normal."}
          </p>
          <div className="cleanup-grid">
            {items.map((m) => (
              <Tile key={m.id} media={m} showDays={canDelete} />
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

function Tile({ media: m, showDays }: { media: Media; showDays: boolean }) {
  const days = daysLeft(m);
  return (
    <button
      type="button"
      className="cleanup-tile"
      title={`${m.path} — keep`}
      onClick={() => useReel.getState().setRatings([{ id: m.id, rating: 0 }])}
    >
      <MiniThumb media={m} />
      {showDays && days !== undefined && (
        <span className="cleanup-days tabular">{days === 0 ? "today" : `${days} d`}</span>
      )}
      <span className="cleanup-keep">
        <ArchiveRestore size={16} /> Keep
      </span>
    </button>
  );
}

type FooterProps = {
  count: number;
  bytes: number;
  done?: number;
  total: number;
  confirming: boolean;
  onConfirm(v: boolean): void;
  onRun(): void;
};

/** Idle → confirm → progress. Keys keep React from reusing the clicked button across states. */
function CleanupFooter(p: FooterProps) {
  if (p.done !== undefined)
    return (
      <span className="text-2 tabular">
        Deleting {p.done} of {p.total}…
      </span>
    );
  if (p.confirming)
    return (
      <div className="footer-row" key="confirm">
        <span className="text-2">
          Delete {p.count} files ({formatBytes(p.bytes)}) for good? This can’t be undone.
        </span>
        <span className="spacer" />
        <Button variant="ghost" onClick={() => p.onConfirm(false)}>
          Cancel
        </Button>
        <Button variant="danger" icon={Trash2} onClick={p.onRun} autoFocus>
          Delete {p.count} files
        </Button>
      </div>
    );
  return (
    <div className="footer-row" key="idle">
      <span className="note">Don’t want to wait {KEEP_DAYS} days?</span>
      <span className="spacer" />
      <Button variant="primary" icon={Trash2} onClick={() => p.onConfirm(true)}>
        Delete now…
      </Button>
    </div>
  );
}
