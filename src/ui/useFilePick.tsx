import { useRef, type ReactNode } from "react";

import { openFiles } from "@/store/openSource";
import { useUi } from "@/store/useUi";

const ACCEPT = "image/*,video/*,.heic,.heif,.mov,.mp4,.m4v";

/**
 * The system picker for files mode. On an iPad it offers Photo Library,
 * Take Photo and Choose File (Files app, USB drives, iCloud Drive).
 * `folder` asks for a whole folder instead (desktop browsers only).
 * `open()` must run inside a click handler — browsers only open pickers on a gesture.
 */
export function useFilePick(folder = false): { input: ReactNode; open(): void } {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={(el) => {
        ref.current = el;
        // Not a React prop; set on the element.
        if (el && folder) el.webkitdirectory = true;
        // React has no onCancel for inputs; the picker closing without a choice fires it.
        if (el) el.oncancel = () => useUi.getState().set({ handover: false });
      }}
      type="file"
      multiple
      accept={folder ? undefined : ACCEPT}
      hidden
      onChange={(e) => {
        useUi.getState().set({ handover: false });
        const files = [...(e.target.files ?? [])];
        // Reset so picking the very same files again still fires a change.
        e.target.value = "";
        if (files.length) void openFiles(files);
      }}
    />
  );
  return {
    input,
    open: () => {
      // Shown behind the picker; it is what you see while iOS prepares the files, until change/cancel.
      useUi.getState().set({ handover: true });
      ref.current?.click();
    },
  };
}
