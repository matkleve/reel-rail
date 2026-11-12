import type { Verdict } from "./deckGesture";

/** Where a thrown card goes: an offset from its resting place, and its turn. */
export type Exit = { x: number; y: number; rot: number };

/** The way each verdict leaves when no finger says otherwise (a button, a key). */
const AWAY: Record<Verdict, [number, number]> = { good: [1, 0.12], bad: [-1, 0.12], top: [0, -1], delete: [0, 1] };
/** How much more a card turns on its way out, sideways. */
const SPIN: Record<Verdict, number> = { good: 22, bad: -22, top: 0, delete: 0 };

/**
 * The fly-out keeps going the way the finger threw it — from where it was let
 * go, along the throw, far enough to leave any screen. A card that stops at the
 * edge and vanishes reads as "gone wrong", not as "thrown" (user, 2026-11-12).
 * A throw that drifted against its verdict (a "good" let go slightly left of
 * straight) leaves the verdict's way instead.
 */
export function exitFor(verdict: Verdict, from: { dx: number; dy: number }, view: { w: number; h: number }): Exit {
  let [ux, uy] = AWAY[verdict];
  const len = Math.hypot(from.dx, from.dy);
  if (len > 24) {
    const fx = from.dx / len;
    const fy = from.dy / len;
    if (fx * ux + fy * uy > 0.3) [ux, uy] = [fx, fy];
  }
  const n = Math.hypot(ux, uy);
  // Far enough to clear the screen, not so far that it is gone in the first frames.
  const dist = Math.hypot(view.w, view.h) * 0.7;
  return { x: from.dx + (ux / n) * dist, y: from.dy + (uy / n) * dist, rot: from.dx / 18 + SPIN[verdict] };
}
