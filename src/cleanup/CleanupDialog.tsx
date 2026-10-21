import { ArchiveRestore, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { TRASH_DIR, formatBytes, moveToTrash } from "@/fs/trash";
import { MiniThumb } from "@/series/MiniThumb";
import { markTrashed } from "@/store/actions";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { DISCARD, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

/** Everything rated "discard", as a grid with its total size, and one button to move it out of the way. */
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
  // Files mode has read-only access: nothing can be moved, so this is a checklist.
  const canMove = useUi((s) => s.sourceKind === "folder");
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

  return (
    <Dialog
      open
      onClose={onDone}
      title="Discards"
      subtitle={items.length ? `${items.length} items · ${formatBytes(bytes)}` : undefined}
      wide
      footer={
        items.length && !canMove ? (
          <span className="note">
            reel-rail can’t delete from your photo library. Use this list to clear them out in the Photos app — or keep
            them; they stay marked.
          </span>
        ) : items.length ? (
          <CleanupFooter
            count={items.length}
            bytes={bytes}
            done={done}
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
          <p>Press ↓ twice on a normal shot, or click the bin in the dock.</p>
        </div>
      ) : (
        <>
          <p className="note">Click a shot to keep it after all — it goes back to normal.</p>
          <div className="cleanup-grid">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                className="cleanup-tile"
                title={`${m.path} — keep`}
                onClick={() => useReel.getState().setRatings([{ id: m.id, rating: 0 }])}
              >
                <MiniThumb media={m} />
                <span className="cleanup-keep">
                  <ArchiveRestore size={16} /> Keep
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

type FooterProps = {
  count: number;
  bytes: number;
  done?: number;
  confirming: boolean;
  onConfirm(v: boolean): void;
  onRun(): void;
};

/** Idle → confirm → progress. Keys keep React from reusing the clicked button across states. */
function CleanupFooter(p: FooterProps) {
  if (p.done !== undefined)
    return (
      <span className="text-2 tabular">
        Moving {p.done} of {p.count}…
      </span>
    );
  if (p.confirming)
    return (
      <div className="footer-row" key="confirm">
        <span className="text-2">
          Move {p.count} files ({formatBytes(p.bytes)}) to <code>{TRASH_DIR}/</code>?
        </span>
        <span className="spacer" />
        <Button variant="ghost" onClick={() => p.onConfirm(false)}>
          Cancel
        </Button>
        <Button variant="danger" icon={Trash2} onClick={p.onRun} autoFocus>
          Move {p.count} files
        </Button>
      </div>
    );
  return (
    <div className="footer-row" key="idle">
      <span className="note">Nothing is deleted. Move a file back and it returns with its rating.</span>
      <span className="spacer" />
      <Button variant="primary" icon={Trash2} onClick={() => p.onConfirm(true)}>
        Move to trash folder…
      </Button>
    </div>
  );
}
