import type { Media, Rating } from "@/types";

/** Edge length of a thumbnail per rating — size IS the rating. */
export const SIZE: Record<Rating, number> = { [-1]: 16, 0: 56, 1: 80, 2: 110 };

export const ITEM_GAP = 8;
export const DAY_WIDTH = 132;
/** Pauses longer than this get visible extra room on the rail. */
export const GAP_HOURS = 3;

export type MediaSlot = { kind: "media"; id: string; x: number; w: number };
export type DaySlot = { kind: "day"; key: string; x: number; date: Date; place?: string };
export type GapSlot = { kind: "gap"; key: string; x: number; w: number; hours: number };
export type Slot = MediaSlot | DaySlot | GapSlot;

export type Layout = { slots: Slot[]; width: number; byId: Map<string, MediaSlot> };

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Extra room for a pause: grows with the log of its length, capped. */
export function gapWidth(hours: number): number {
  return Math.round(Math.min(120, 28 + 18 * Math.log2(hours / GAP_HOURS)));
}

function mostCommon(values: (string | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | undefined;
  for (const [v, n] of counts) if (!best || n > counts.get(best)!) best = v;
  return best;
}

/**
 * Places every medium on the rail, left to right in time. Recomputed on every
 * rating change — O(n), a few ms for thousands of items, and it is what lets
 * neighbours slide aside when an item grows.
 */
export function layoutTimeline(order: string[], media: Record<string, Media>): Layout {
  const slots: Slot[] = [];
  const byId = new Map<string, MediaSlot>();
  const placesByDay = new Map<string, (string | undefined)[]>();
  let x = 0;
  let prev: Date | undefined;
  let day: DaySlot | undefined;

  for (const id of order) {
    const m = media[id];
    if (!m) continue;
    const t = new Date(m.takenAt);
    const key = dayKey(t);

    if (!prev || dayKey(prev) !== key) {
      x += prev ? ITEM_GAP : 0;
      day = { kind: "day", key, x, date: t };
      slots.push(day);
      placesByDay.set(key, []);
      x += DAY_WIDTH;
    } else {
      const hours = (t.getTime() - prev.getTime()) / 36e5;
      if (hours > GAP_HOURS) {
        const w = gapWidth(hours);
        slots.push({ kind: "gap", key: `gap-${id}`, x, w, hours });
        x += w;
      }
    }

    placesByDay.get(key)!.push(m.place);
    const w = SIZE[m.rating];
    const slot: MediaSlot = { kind: "media", id, x, w };
    slots.push(slot);
    byId.set(id, slot);
    x += w + ITEM_GAP;
    prev = t;
  }

  for (const s of slots) if (s.kind === "day") s.place = mostCommon(placesByDay.get(s.key) ?? []);

  return { slots, width: x, byId };
}

/** Index of the first slot whose right edge reaches `x` (binary search). */
export function firstVisible(slots: Slot[], x: number): number {
  let lo = 0;
  let hi = slots.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const s = slots[mid]!;
    const right = s.x + (s.kind === "day" ? DAY_WIDTH : s.w);
    if (right < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
