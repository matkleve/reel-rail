import { FolderInput, FolderPen } from "lucide-react";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Workflow } from "@/types";
import { Dialog } from "@/ui/kit/Dialog";

/**
 * Asked once per folder (and changeable in the folder menu): does reel-rail
 * change this folder, or leave it alone and export the result?
 */
export function WorkflowDialog() {
  const open = useUi((s) => s.dialog === "workflow");
  const current = useReel((s) => s.reel.workflow);
  const folder = useUi((s) => s.folderName);
  if (!open) return null;
  const choose = (workflow: Workflow) => {
    useReel.setState((s) => ({ reel: { ...s.reel, workflow } }));
    useUi.getState().set({ dialog: null });
  };
  // The first time there is no default: the choice decides whether files move.
  const close = () => (current ? useUi.getState().set({ dialog: null }) : undefined);

  return (
    <Dialog
      open
      onClose={close}
      title={`How should reel-rail work on “${folder}”?`}
      subtitle="You can change this later in the folder menu."
    >
      <div className="choice-list">
        <button
          type="button"
          className="choice"
          aria-pressed={current === "edit"}
          onClick={() => choose("edit")}
          data-autofocus
        >
          <FolderPen size={22} aria-hidden="true" />
          <span>
            <strong>Edit this folder</strong>
            <span>
              Discards and the cut-away parts of videos leave the folder — it ends up holding only what you keep. They
              wait 30 days in Recently deleted.
            </span>
          </span>
        </button>
        <button type="button" className="choice" aria-pressed={current === "export"} onClick={() => choose("export")}>
          <FolderInput size={22} aria-hidden="true" />
          <span>
            <strong>Leave it as it is, export the result</strong>
            <span>
              Nothing in this folder changes. When you are done, “Export result…” copies what you kept — trims applied —
              into a new folder.
            </span>
          </span>
        </button>
      </div>
    </Dialog>
  );
}
