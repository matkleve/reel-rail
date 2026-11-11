import { useRef, useState, type PointerEvent } from "react";

import { classifyThrow, type Throw } from "./deckGesture";

export type DeckDrag = { dx: number; dy: number; active: boolean };

const IDLE: DeckDrag = { dx: 0, dy: 0, active: false };

/**
 * Dragging the top card. Pointer capture on the card itself (unlike the
 * carousel, which listens on window): there is only one card to hit, and a
 * finger that leaves it mid-throw must keep throwing it.
 *
 * Controls on the card (pick, place field) start no drag — their own taps
 * would otherwise turn into tiny throws.
 */
export function useDeckDrag(onThrow: (t: Throw) => void, enabled: boolean) {
  const [drag, setDrag] = useState<DeckDrag>(IDLE);
  const start = useRef<{ x: number; y: number; t: number; pointer: number }>(undefined);

  const end = () => {
    start.current = undefined;
    setDrag(IDLE);
  };

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (!enabled || e.button !== 0 || !e.isPrimary) return;
      if ((e.target as Element).closest("button, input, a, [data-no-drag]")) return;
      start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, pointer: e.pointerId };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ dx: 0, dy: 0, active: true });
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || e.pointerId !== s.pointer) return;
      setDrag({ dx: e.clientX - s.x, dy: e.clientY - s.y, active: true });
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || e.pointerId !== s.pointer) return;
      const t = classifyThrow(e.clientX - s.x, e.clientY - s.y, e.timeStamp - s.t);
      end();
      onThrow(t);
    },
    onPointerCancel: end,
    // A native image drag would cancel the pointer stream mid-throw.
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };

  return { drag, handlers };
}
