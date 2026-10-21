import { useEffect } from "react";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { TOGGLE_PLAY } from "./Preview";

type Handler = (e: KeyboardEvent) => void;

const reel = () => useReel.getState();
const ui = () => useUi.getState();

/** Keyed by `KeyboardEvent.key`; letters are matched lower-case. */
const KEYS: Record<string, Handler> = {
  ArrowLeft: (e) => reel().step(-1, e.shiftKey),
  ArrowRight: (e) => reel().step(1, e.shiftKey),
  ArrowUp: () => reel().rate(1),
  ArrowDown: () => reel().rate(-1),
  Home: () => {
    const first = reel().order[0];
    if (first) reel().setCurrent(first);
  },
  End: () => {
    const last = reel().order.at(-1);
    if (last) reel().setCurrent(last);
  },
  " ": () => window.dispatchEvent(new Event(TOGGLE_PLAY)),
  Escape: () => reel().clearSelection(),
  z: () => reel().undo(),
  s: () => {
    if (reel().selection.size) ui().set({ dialog: "createSeries" });
  },
  p: () => ui().set({ placeFocus: ui().placeFocus + 1 }),
};

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** All timeline shortcuts. Inactive while typing or while a dialog is open. */
export function useKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui().phase !== "ready" || typing(e.target)) return;
      if (e.key === "?") {
        ui().set({ dialog: ui().dialog === "help" ? null : "help" });
        e.preventDefault();
        return;
      }
      if (ui().dialog || e.altKey || e.metaKey || e.ctrlKey) return;
      const handler = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!handler) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
