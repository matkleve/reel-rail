import type { Media } from "@/types";

/**
 * The waveform timeline: media density over the trip, drawn like an audio
 * waveform. Pure model — the component only draws and handles pointers.
 *
 * Time is "effective": pauses inside a day are capped at 3 h and every night
 * counts as a fixed 2 h, so a sleepless 14-hour city day does not get
 * squeezed next to an empty night.
 */

export const MAX_PAUSE_H = 3;
export const NIGHT_H = 2;
/** The deepest zoom shows half an hour across the whole bar. */
export const MIN_SPAN_H = 0.5;

export type DayMark = { key: string; pos: number; date: Date };
export type WaveModel = { ids: string[]; pos: number[]; total: number; days: DayMark[] };
export type Window = { start: number; span: number };
export type Bins = { count: number[]; liked: number[]; top: boolean[]; max: number };

const dayKey = (t: Date) => `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;

export function buildWave(order: string[], media: Record<string, Media>): WaveModel {
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
export function windowAt(model: WaveModel, zoom: number, focus: number): Window {
  const span = Math.max(MIN_SPAN_H, model.total / Math.max(1, zoom));
  if (span >= model.total) return { start: 0, span: model.total };
  const start = Math.max(0, Math.min(model.total - span, focus - span / 2));
  return { start, span };
}

/** Largest zoom that still respects MIN_SPAN_H. */
export function maxZoom(model: WaveModel): number {
  return Math.max(1, model.total / MIN_SPAN_H);
}

export function binWave(model: WaveModel, media: Record<string, Media>, win: Window, n: number): Bins {
  const count = new Array<number>(n).fill(0);
  const liked = new Array<number>(n).fill(0);
  const top = new Array<boolean>(n).fill(false);
  const lo = lowerBound(model.pos, win.start);
  for (let i = lo; i < model.pos.length && model.pos[i]! <= win.start + win.span; i++) {
    const b = Math.min(n - 1, Math.floor(((model.pos[i]! - win.start) / win.span) * n));
    const m = media[model.ids[i]!]!;
    count[b]!++;
    if (m.rating >= 1) liked[b]!++;
    if (m.rating === 2) top[b] = true;
  }
  return { count, liked, top, max: Math.max(1, ...count) };
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
