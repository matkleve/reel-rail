import { saveReel } from "@/fs/reelFile";
import { getRoot } from "@/fs/session";

import { useReel } from "./useReel";

const DEBOUNCE_MS = 500;

/**
 * Saves `.reel.json` 500 ms after the last change. Writes never overlap: a
 * change that lands mid-write schedules exactly one follow-up save.
 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writing = false;
  let dirty = false;

  const flush = async () => {
    if (writing) {
      dirty = true;
      return;
    }
    writing = true;
    dirty = false;
    const { reel, setSaveState } = useReel.getState();
    setSaveState("saving");
    try {
      await saveReel(getRoot(), reel);
      setSaveState("saved");
    } catch (err) {
      console.error("reel-rail: save failed", err);
      setSaveState("error");
    } finally {
      writing = false;
      if (dirty) void flush();
    }
  };

  const unsubscribe = useReel.subscribe((state, prev) => {
    if (state.reel === prev.reel) return;
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), DEBOUNCE_MS);
  });

  // Last-chance save when the tab closes with a pending change.
  const onHide = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      void flush();
    }
  };
  window.addEventListener("pagehide", onHide);

  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", onHide);
    clearTimeout(timer);
  };
}
