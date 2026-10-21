import { ChevronDown, FolderOpen, Images, Keyboard, Settings } from "lucide-react";

import { canPickFolder } from "@/fs/support";
import { useUi } from "@/store/useUi";

import { Kbd } from "./kit/Kbd";
import { Popover } from "./kit/Popover";
import { useFilePick } from "./useFilePick";

/** Files mode's counterpart to the folder menu: add more photos, settings. */
export function LibraryMenu() {
  const name = useUi((s) => s.folderName);
  const photos = useFilePick();
  const folder = useFilePick(true);
  const close = () => document.querySelector<HTMLElement>(".popover:popover-open")?.hidePopover();

  return (
    <>
      {photos.input}
      {folder.input}
      <Popover
        align="start"
        trigger={(p) => (
          <button type="button" className="folder-btn" {...p}>
            <Images size={15} aria-hidden="true" />
            <span>{name}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      >
        <button type="button" className="menu-item" onClick={() => (close(), photos.open())}>
          <Images size={15} /> Add photos & videos…
        </button>
        {canPickFolder() && (
          <button type="button" className="menu-item" onClick={() => (close(), folder.open())}>
            <FolderOpen size={15} /> Add a folder…
          </button>
        )}
        <hr />
        <button type="button" className="menu-item" onClick={() => (close(), useUi.getState().set({ dialog: "settings" }))}>
          <Settings size={15} /> Tag presets…
        </button>
        <button type="button" className="menu-item" onClick={() => (close(), useUi.getState().set({ dialog: "help" }))}>
          <Keyboard size={15} /> Keyboard shortcuts <Kbd>?</Kbd>
        </button>
      </Popover>
    </>
  );
}
