import { useEffect } from "react";

import { TOGGLE_MUTE, TOGGLE_PLAY } from "@/carousel/events";
import { rejectStackRest, toggleStack, toggleTag } from "@/store/actions";
import { togglePick } from "@/store/picks";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

type Handler = (e: KeyboardEvent) => void;

const reel = () => useReel.getState();
const ui = () => useUi.getState();
/** Waveform zoom; the upper bound is enforced where the trip length is known (Waveform). */
const zoomBy = (f: number) => ui().set({ waveZoom: Math.max(1, ui().waveZoom * f) });

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
  " ": () => void togglePick(),
  Escape: () => reel().clearSelection(),
  Enter: () => toggleStack(),
  z: () => reel().undo(),
  x: () => rejectStackRest(),
  v: () => window.dispatchEvent(new Event(TOGGLE_PLAY)),
  m: () => window.dispatchEvent(new Event(TOGGLE_MUTE)),
  s: () => {
    if (reel().selection.size) ui().set({ dialog: "createSeries" });
  },
  p: () => ui().set({ placeFocus: ui().placeFocus + 1 }),
  t: () => ui().set({ tagEditing: true }),
  "+": () => zoomBy(2),
  "=": () => zoomBy(2),
  "-": () => zoomBy(1 / 2),
  "0": () => ui().set({ waveZoom: 1 }),
};

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** All shortcuts. Inactive while typing or while a dialog is open. */
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

      // Digits 1–9 toggle the tag presets. `code` so Shift or an AZERTY layout still works.
      const digit = /^Digit([1-9])$/.exec(e.code)?.[1];
      const preset = digit ? reel().reel.tagPresets[Number(digit) - 1] : undefined;
      if (preset) {
        e.preventDefault();
        toggleTag(preset);
        return;
      }

      const handler = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!handler) return;
      // Holding Space must not copy the same file again and again.
      if (e.repeat && e.key === " ") return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
