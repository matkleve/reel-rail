import { useMemo, useState } from "react";

import { TRASH_DIR, formatBytes, moveToTrash } from "@/fs/trash";
import { markTrashed } from "@/store/actions";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { DISCARD, type Media } from "@/types";
import { Dialog } from "@/ui/Dialog";
import { MiniThumb } from "@/series/MiniThumb";

/** Everything rated "discard", as a grid, with its total size — and one button to move it out of the way. */
export function CleanupDialog() {
  const open = useUi((s) => s.dialog === "cleanup");
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title="Discards" wide>
      {open && <CleanupBody onDone={close} />}
    </Dialog>
  );
}

function CleanupBody({ onDone }: { onDone(): void }) {
  const order = useReel((s) => s.order);
  const media = useReel((s) => s.reel.media);
  const items = useMemo(
    () => order.flatMap((id): Media[] => (media[id]!.rating === DISCARD ? [media[id]!] : [])),
    [order, media],
  );
  const bytes = items.reduce((n, m) => n + (m.size ?? 0), 0);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<number>();

  const run = async () => {
    setDone(0);
    try {
      const moved = await moveToTrash(items, setDone);
      markTrashed(moved);
      showToast(`${moved.length} files moved to ${TRASH_DIR}`);
      onDone();
    } catch (err) {
      showToast(`Moving stopped: ${err instanceof Error ? err.message : err}`, "error");
      setDone(undefined);
    }
  };

  if (!items.length) return <p className="muted">Nothing marked as discard. Press ↓ twice on a normal item to mark one.</p>;

  return (
    <>
      <p>
        <strong className="tabular">{items.length}</strong> items · <strong className="tabular">{formatBytes(bytes)}</strong>
      </p>
      <div className="cleanup-grid">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            className="cleanup-tile"
            title={`${m.path} — click to keep (rating back to neutral)`}
            onClick={() => useReel.getState().setRatings([{ id: m.id, rating: 0 }])}
          >
            <MiniThumb media={m} />
          </button>
        ))}
      </div>
      <p className="muted small">
        Click a tile to keep it. Moving puts the files into <code>{TRASH_DIR}/</code> inside your folder — nothing is
        deleted, and moving a file back brings it back with its rating.
      </p>
      <div className="dialog-footer">
        {done !== undefined ? (
          <span className="muted tabular">
            Moving {done} / {items.length}…
          </span>
        ) : confirming ? (
          <>
            <span className="muted">
              Move {items.length} files ({formatBytes(bytes)})?
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void run()} autoFocus>
              Move to {TRASH_DIR}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
            Move to trash folder…
          </button>
        )}
      </div>
    </>
  );
}
