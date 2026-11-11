import type { Rating } from "@/types";

/**
 * The phone's swipe deck: one card at a time, and the direction you throw it
 * is the decision. Pure, so the thresholds are tested rather than tuned by
 * feel on one device.
 *
 * Note the axes are the other way round from the carousel (src/carousel/
 * gesture.ts): there sideways browses and up/down rates. On the deck every
 * direction rates, and the deck moves on by itself — browsing is the
 * timeline's job.
 */
export type Verdict = "good" | "bad" | "top" | "delete";

/**
 * What each throw sets the rating to. Absolute, not a step: a swipe means the
 * same every time. Left is "bad", not "delete": a bad shot may still be the
 * filler a series needs. Deleting is its own, deliberate direction (down).
 */
export const VERDICT_RATING: Record<Verdict, Rating> = { good: 1, bad: -1, top: 2, delete: -2 };

/** Distance that decides on release, in px. */
export const DECIDE_PX = 96;
/** A short, fast flick decides too (px/ms), as long as it travelled this far. */
const FLICK_SPEED = 0.6;
const FLICK_MIN = 36;
export const TAP_SLOP = 10;

export type Throw = { kind: "tap" } | { kind: "decide"; verdict: Verdict } | { kind: "none" };

export function verdictOf(dx: number, dy: number): Verdict {
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "good" : "bad";
  return dy < 0 ? "top" : "delete";
}

export function classifyThrow(dx: number, dy: number, ms: number): Throw {
  const dist = Math.hypot(dx, dy);
  if (dist < TAP_SLOP) return { kind: "tap" };
  const fast = dist / Math.max(ms, 1) >= FLICK_SPEED && dist >= FLICK_MIN;
  const along = Math.max(Math.abs(dx), Math.abs(dy));
  if (along >= DECIDE_PX || fast) return { kind: "decide", verdict: verdictOf(dx, dy) };
  return { kind: "none" };
}

/** 0…1 per direction while dragging — drives the stamps and the card behind. */
export function leanOf(dx: number, dy: number): Record<Verdict, number> {
  const clamp = (v: number) => Math.max(0, Math.min(1, v / DECIDE_PX));
  const sideways = Math.abs(dx) >= Math.abs(dy);
  return {
    good: sideways ? clamp(dx) : 0,
    bad: sideways ? clamp(-dx) : 0,
    top: sideways ? 0 : clamp(-dy),
    delete: sideways ? 0 : clamp(dy),
  };
}
