/**
 * What a finger (or mouse) drag on the stage means. Pure, so the thresholds
 * are tested rather than tuned by feel on one device.
 *
 * - barely moved            → tap (the card's own click handles it)
 * - mostly sideways          → browse; a longer or faster swipe skips more
 * - mostly up / down         → rate one level better / worse
 */
export type Gesture =
  | { kind: "tap" }
  | { kind: "browse"; steps: number }
  | { kind: "rate"; delta: 1 | -1 }
  | { kind: "none" };

export const TAP_SLOP = 10;
export const SWIPE_MIN = 48;
/** Sideways distance per card skipped. */
const PX_PER_CARD = 170;

export function classify(dx: number, dy: number, ms: number): Gesture {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < TAP_SLOP && ay < TAP_SLOP) return { kind: "tap" };
  if (ax >= ay && ax >= SWIPE_MIN) {
    const fast = ax / Math.max(ms, 1) > 1.2; // px/ms — a flick
    const steps = Math.min(8, Math.max(1, Math.round(ax / PX_PER_CARD) + (fast ? 1 : 0)));
    // Content follows the finger: swiping left brings the next card in.
    return { kind: "browse", steps: dx < 0 ? steps : -steps };
  }
  if (ay > ax && ay >= SWIPE_MIN) return { kind: "rate", delta: dy < 0 ? 1 : -1 };
  return { kind: "none" };
}

/** Which axis a drag in progress is on — for live feedback before the finger lifts. */
export function axisOf(dx: number, dy: number): "x" | "y" | undefined {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < TAP_SLOP) return undefined;
  return ax >= ay ? "x" : "y";
}
