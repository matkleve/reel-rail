import type { Media } from "@/types";

/**
 * The timeline under the photos: bars over time, stacked by rating, so you
 * see at a glance where the top shots are and where only fillers are. Pure
 * model — the component only draws and handles pointers.
 *
 * Time is "effective": pauses inside a day are capped at 3 h and every night
 * counts as a fixed 2 h, so a sleepless 14-hour city day does not get
 * squeezed next to an empty night.
 *
 * (It was a waveform until 2026-11: thickness, quality and tag in one shape
 * read beautifully on a big screen and not at all on a phone. The question
 * people ask the timeline is "where are my best shots?" — stacked bars
 * answer exactly that.)
 */

export const MAX_PAUSE_H = 3;
export const NIGHT_H = 2;
/** The deepest zoom shows half an hour across the whole bar. */
export const MIN_SPAN_H = 0.5;

export type DayMark = { key: string; pos: number; date: Date };
export type TimeAxis = { ids: string[]; pos: number[]; total: number; days: DayMark[] };
export type Window = { start: number; span: number };

const dayKey = (t: Date) => `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;

export function buildAxis(order: string[], media: Record<string, Media>): TimeAxis {
  const pos: number[] = [];
  const days: DayMark[] = [];
  let p = 0;
  let prev: Date | undefined;
  for (const id of order) {
    const t = new Date(media[id]!.takenAt);
    if (prev) {
      const sameDay = dayKey(prev) === dayKey(t);
      p += sameDay ? Math.min(MAX_PAUSE_H, (t.getTime() - prev.getTime()) / 36e5) : NIGHT_H;
    }
    if (!prev || dayKey(prev) !== dayKey(t)) days.push({ key: dayKey(t), pos: p, date: t });
    pos.push(p);
    prev = t;
  }
  return { ids: order, pos, total: Math.max(p, MIN_SPAN_H), days };
}

/** The visible slice at a zoom (1 = whole trip), centred on `focus` where possible. */
export function windowAt(axis: TimeAxis, zoom: number, focus: number): Window {
  const span = Math.max(MIN_SPAN_H, axis.total / Math.max(1, zoom));
  if (span >= axis.total) return { start: 0, span: axis.total };
  const start = Math.max(0, Math.min(axis.total - span, focus - span / 2));
  return { start, span };
}

/** Largest zoom that still respects MIN_SPAN_H. */
export function maxZoom(axis: TimeAxis): number {
  return Math.max(1, axis.total / MIN_SPAN_H);
}

/** How a bar is stacked, bottom up: the best at the base, where the eye lands. */
export const LEVELS = ["top", "good", "bad", "unrated"] as const;
export type Level = (typeof LEVELS)[number];
export type Bin = Record<Level, number>;
export type Bars = { bins: Bin[]; max: number };

/**
 * A bar is never scaled as if fewer than this many shots filled it: one photo
 * in a quiet hour reads as "one photo", not as a full-height bar. 3, not 6:
 * at 6 a short trip's bars were dots on a phone (user, 2026-11-12).
 */
export const MIN_SCALE = 3;

/** Which part of a bar a medium is. Discards are not drawn: they are on their way out. */
export function levelOf(m: Pick<Media, "rating">): Level | undefined {
  if (m.rating >= 2) return "top";
  if (m.rating === 1) return "good";
  if (m.rating === -1) return "bad";
  if (m.rating === 0) return "unrated";
  return undefined;
}

/** Counts per bin over the visible window. O(media in the window). */
export function barBins(axis: TimeAxis, media: Record<string, Media>, win: Window, n: number): Bars {
  const bins: Bin[] = Array.from({ length: n }, () => ({ top: 0, good: 0, bad: 0, unrated: 0 }));
  for (let i = lowerBound(axis.pos, win.start); i < axis.pos.length && axis.pos[i]! <= win.start + win.span; i++) {
    const level = levelOf(media[axis.ids[i]!]!);
    if (!level) continue;
    const at = win.span ? (axis.pos[i]! - win.start) / win.span : 0;
    bins[Math.min(n - 1, Math.floor(at * n))]![level]++;
  }
  let max = 0;
  for (const b of bins) max = Math.max(max, b.top + b.good + b.bad + b.unrated);
  return { bins, max: Math.max(max, MIN_SCALE) };
}

/** First index with pos ≥ p. */
export function lowerBound(pos: number[], p: number): number {
  let lo = 0;
  let hi = pos.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pos[mid]! < p) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the medium closest in (effective) time to `p`. */
export function nearest(pos: number[], p: number): number {
  const i = lowerBound(pos, p);
  if (i === 0) return 0;
  if (i >= pos.length) return pos.length - 1;
  return p - pos[i - 1]! <= pos[i]! - p ? i - 1 : i;
}
