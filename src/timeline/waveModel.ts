import type { Media, Rating } from "@/types";

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

/** The layer for untagged media (and tags beyond the colour budget). */
export const NEUTRAL = "";

/**
 * One translucent wave per tag. Per bin: how many media (→ thickness) and
 * their average rating (→ how far above or below the middle line it floats).
 * Both are smoothed with a small Gaussian so the waves read as waves, not bars.
 */
export type Layer = { tag: string; count: number[]; mean: number[]; total: number };
export type Dot = { at: number; rating: Rating; tag: string };
export type Waves = { layers: Layer[]; dots: Dot[]; spine: number[]; max: number };

const SIGMA = 2.2;
const KERNEL = (() => {
  const r = Math.ceil(SIGMA * 3);
  return Array.from({ length: r * 2 + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * SIGMA * SIGMA)));
})();

function smooth(values: number[]): number[] {
  const r = (KERNEL.length - 1) / 2;
  return values.map((_, i) => {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += (values[i + k] ?? 0) * KERNEL[k + r]!;
    return sum;
  });
}

export function waveLayers(
  model: WaveModel,
  media: Record<string, Media>,
  win: Window,
  n: number,
  maxTags = 9,
): Waves {
  const raw = new Map<string, { count: number[]; sum: number[]; total: number }>();
  const all = { count: new Array<number>(n).fill(0), sum: new Array<number>(n).fill(0) };
  const dots: Dot[] = [];
  const slot = (tag: string) => {
    let l = raw.get(tag);
    if (!l) raw.set(tag, (l = { count: new Array<number>(n).fill(0), sum: new Array<number>(n).fill(0), total: 0 }));
    return l;
  };

  for (let i = lowerBound(model.pos, win.start); i < model.pos.length && model.pos[i]! <= win.start + win.span; i++) {
    const at = (model.pos[i]! - win.start) / win.span;
    const b = Math.min(n - 1, Math.floor(at * n));
    const m = media[model.ids[i]!]!;
    for (const tag of m.tags.length ? m.tags : [NEUTRAL]) {
      const l = slot(tag);
      l.count[b]!++;
      l.sum[b]! += m.rating;
      l.total++;
    }
    all.count[b]!++;
    all.sum[b]! += m.rating;
    dots.push({ at, rating: m.rating, tag: m.tags[0] ?? NEUTRAL });
  }

  // Colour budget: the most frequent tags get their own wave, the rest join the neutral one.
  const tags = [...raw.entries()].filter(([t]) => t !== NEUTRAL).sort((a, b) => b[1].total - a[1].total);
  const keep = new Set(tags.slice(0, maxTags).map(([t]) => t));
  const neutral = slot(NEUTRAL);
  for (const [, l] of tags.slice(maxTags)) {
    l.count.forEach((c, i) => {
      neutral.count[i]! += c;
      neutral.sum[i]! += l.sum[i]!;
    });
    neutral.total += l.total;
  }
  for (const d of dots) if (!keep.has(d.tag)) d.tag = NEUTRAL;

  const layers: Layer[] = [];
  let max = 0;
  for (const [tag, l] of raw) {
    if (tag !== NEUTRAL && !keep.has(tag)) continue;
    if (!l.total) continue;
    const count = smooth(l.count);
    const sum = smooth(l.sum);
    const mean = count.map((c, i) => (c > 1e-3 ? sum[i]! / c : 0));
    max = Math.max(max, ...count);
    layers.push({ tag, count, mean, total: l.total });
  }
  // Neutral first, so the coloured tag waves glow on top of it.
  layers.sort((a, b) => (a.tag === NEUTRAL ? -1 : b.tag === NEUTRAL ? 1 : b.total - a.total));

  const c = smooth(all.count);
  const sAll = smooth(all.sum);
  // Eases toward the middle where media thin out, instead of dropping off a cliff at a gap.
  const spine = c.map((x, i) => (x > 1e-3 ? (sAll[i]! / x) * Math.min(1, x * 2) : 0));
  return { layers, dots, spine, max: Math.max(max, 1e-3) };
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
