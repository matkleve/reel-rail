import { useRef, useState, type PointerEvent, type RefObject } from "react";

import { DECIDE_PX, classifyThrow, leanOf, type Throw } from "./deckGesture";

export type At = { dx: number; dy: number };
const LEVELS = ["good", "bad", "top", "delete"] as const;

/**
 * Dragging the top card. Pointer capture on the card itself (unlike the
 * carousel, which listens on window): there is only one card to hit, and a
 * finger that leaves it mid-throw must keep throwing it.
 *
 * The card follows the finger by CSS variables written straight onto it, once
 * per frame — not through React state: a re-render of the card (photo, video,
 * tools) on every pointer move stuttered on an iPhone (user, 2026-11-12).
 * React only hears when a drag starts and ends.
 *
 * Controls on the card (pick, place field) start no drag — their own taps
 * would otherwise turn into tiny throws.
 */
export function useDeckDrag(
  card: RefObject<HTMLElement | null>,
  deck: RefObject<HTMLElement | null>,
  onRelease: (t: Throw, at: At) => void,
  enabled: boolean,
) {
  const [active, setActive] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; pointer: number }>(undefined);
  const at = useRef<At>({ dx: 0, dy: 0 });
  const frame = useRef(0);

  const paint = () => {
    frame.current = 0;
    const { dx, dy } = at.current;
    const el = card.current;
    if (el) {
      el.style.setProperty("--dx", `${dx}px`);
      el.style.setProperty("--dy", `${dy}px`);
      // The card tilts as it is thrown sideways, like one held at the bottom.
      el.style.setProperty("--rot", `${dx / 18}deg`);
      const lean = leanOf(dx, dy);
      for (const k of LEVELS) el.style.setProperty(`--${k}`, String(lean[k]));
    }
    deck.current?.style.setProperty("--progress", String(Math.min(1, Math.max(Math.abs(dx), Math.abs(dy)) / DECIDE_PX)));
  };
  const moveTo = (next: At) => {
    at.current = next;
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  };
  /** Back to rest — the transition (no longer dragging) springs it home. */
  const settle = () => {
    cancelAnimationFrame(frame.current);
    at.current = { dx: 0, dy: 0 };
    paint();
  };

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (!enabled || e.button !== 0 || !e.isPrimary) return;
      if ((e.target as Element).closest("button, input, a, [data-no-drag]")) return;
      start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, pointer: e.pointerId };
      e.currentTarget.setPointerCapture(e.pointerId);
      setActive(true);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || e.pointerId !== s.pointer) return;
      moveTo({ dx: e.clientX - s.x, dy: e.clientY - s.y });
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s || e.pointerId !== s.pointer) return;
      start.current = undefined;
      const released = { dx: e.clientX - s.x, dy: e.clientY - s.y };
      const t = classifyThrow(released.dx, released.dy, e.timeStamp - s.t);
      cancelAnimationFrame(frame.current);
      at.current = released;
      // A throw flies on from exactly here; anything else springs back.
      if (t.kind === "decide") paint();
      else settle();
      setActive(false);
      onRelease(t, released);
    },
    onPointerCancel() {
      start.current = undefined;
      settle();
      setActive(false);
    },
    // A native image drag would cancel the pointer stream mid-throw.
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };

  return { active, handlers, settle };
}
