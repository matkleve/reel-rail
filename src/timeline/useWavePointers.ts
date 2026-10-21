import { useRef, useState, type PointerEvent, type RefObject } from "react";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { nearest, type WaveModel, type Window } from "./waveform";

/**
 * Pointer handling for the waveform: one finger (or the mouse) jumps and
 * scrubs, two fingers pinch to zoom.
 *
 * While scrubbing, the window holds still — otherwise it would re-centre on
 * every jump and run away under the finger.
 */
export function useWavePointers(box: RefObject<HTMLElement | null>, model: WaveModel, win: Window, maxZoom: number) {
  const [dragWin, setDragWin] = useState<Window>();
  const pointers = useRef(new Map<number, number>());
  const pinch = useRef<{ dist: number; zoom: number }>(undefined);

  const jump = (clientX: number, w: Window) => {
    const rect = box.current!.getBoundingClientRect();
    const p = w.start + ((clientX - rect.left) / rect.width) * w.span;
    const id = model.ids[nearest(model.pos, p)];
    if (id) useReel.getState().setCurrent(id);
  };
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.abs((a ?? 0) - (b ?? 0));
  };

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, e.clientX);
      if (pointers.current.size >= 2) {
        // (Re)start the pinch from the fingers now down — a third finger must not make the zoom jump.
        pinch.current = { dist: Math.max(20, spread()), zoom: useUi.getState().waveZoom };
        setDragWin(undefined);
      } else if (pointers.current.size === 1) {
        setDragWin(win);
        jump(e.clientX, win);
      }
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, e.clientX);
      if (pinch.current && pointers.current.size >= 2) {
        const zoom = pinch.current.zoom * (spread() / pinch.current.dist);
        useUi.getState().set({ waveZoom: Math.max(1, Math.min(maxZoom, zoom)) });
      } else if (dragWin) {
        jump(e.clientX, dragWin);
      }
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = undefined;
      else pinch.current = { dist: Math.max(20, spread()), zoom: useUi.getState().waveZoom };
      if (pointers.current.size === 0) setDragWin(undefined);
    },
  };
  return { dragWin, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}
