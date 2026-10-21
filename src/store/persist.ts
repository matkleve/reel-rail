import { getSource } from "@/fs/session";

import { useReel } from "./useReel";

const DEBOUNCE_MS = 500;

/**
 * Saves the reel (`.reel.json`, or the browser library in files mode) 500 ms after the last change. Writes never overlap: a
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
      await getSource().saveReel(reel);
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

/**
 * Saves right now, for steps that must be on disk before the next file
 * operation (a trim: the record of where the original went is written
 * before the trimmed file takes its name).
 */
export async function saveNow(): Promise<void> {
  await getSource().saveReel(useReel.getState().reel);
}
