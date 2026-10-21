import { useEffect, useState, type RefObject } from "react";

import { useReel } from "@/store/useReel";

import { axisOf, classify } from "./gesture";

export type Drag = { dx: number; dy: number; axis: "x" | "y" };

const LONG_PRESS_MS = 450;

/**
 * Touch (and mouse-drag) gestures on the stage: swipe to browse, swipe up /
 * down to rate, press and hold a card to add it to the selection.
 *
 * Window-level move/up listeners instead of pointer capture: capturing would
 * retarget the click to the stage, and a tap must still reach its card.
 * Returns the drag in progress, for live feedback.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>): Drag | undefined {
  const [drag, setDrag] = useState<Drag>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; t: number; pointerId: number; id?: string } | undefined;
    let suppressClick = false;
    let longPress: ReturnType<typeof setTimeout> | undefined;

    const end = () => {
      clearTimeout(longPress);
      start = undefined;
      setDrag(undefined);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", end);
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || start) return;
      const id = (e.target as Element).closest<HTMLElement>("[data-id]")?.dataset.id;
      start = { x: e.clientX, y: e.clientY, t: e.timeStamp, pointerId: e.pointerId, id };
      if (id) {
        longPress = setTimeout(() => {
          useReel.getState().setCurrent(id, "toggle");
          suppressClick = true;
          end();
        }, LONG_PRESS_MS);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", end);
    };

    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const axis = axisOf(dx, dy);
      if (!axis) return;
      clearTimeout(longPress);
      setDrag({ dx, dy, axis });
    };

    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.pointerId) return;
      const g = classify(e.clientX - start.x, e.clientY - start.y, e.timeStamp - start.t);
      const s = useReel.getState();
      if (g.kind !== "tap") suppressClick = true;
      if (g.kind === "browse") for (let i = 0; i < Math.abs(g.steps); i++) s.step(g.steps > 0 ? 1 : -1);
      if (g.kind === "rate") s.rate(g.delta);
      end();
    };

    // A swipe that ends on a card must not also count as a tap on it.
    const click = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    // A native image drag would cancel the pointer stream mid-swipe.
    const noDrag = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("click", click, true);
    el.addEventListener("dragstart", noDrag);
    return () => {
      end();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("click", click, true);
      el.removeEventListener("dragstart", noDrag);
    };
  }, [ref]);

  return drag;
}
