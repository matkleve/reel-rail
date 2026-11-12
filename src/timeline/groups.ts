import type { Media } from "@/types";

import { dayKey } from "./days";

/**
 * How the phone timeline stacks the photos (user, 2026-11-12): one by one,
 * per day, per stretch of time (found from the gaps between shots), or per
 * place. Pure: grouping, cover and counts; the screen is DayPiles.
 */
export type GroupBy = "single" | "day" | "time" | "place";

export type Group = {
  /** Stable while the photos do not change: "d:2026-10-14", "t:<first id>", "p:<name>" … */
  key: string;
  ids: string[];
  /** The photos on top of the stack, best first (cover + the two peeking out). */
  top3: string[];
  counts: { top: number; good: number; bad: number; unrated: number };
  /** For the label: a place name when the group is one (place mode). */
  place?: string;
  /** Place mode: photos without a place or GPS. */
  noPlace?: boolean;
  /** Place mode: an unnamed GPS cluster, numbered in order of appearance. */
  spot?: number;
};

const MIN = 60_000;
/** Time groups never split at less than this gap, nor need more than this one. */
export const TIME_GAP_MIN = 30 * MIN;
export const TIME_GAP_MAX = 6 * 60 * MIN;
/** Shots within this distance of a group's middle are one place. */
export const PLACE_RADIUS_KM = 1.5;

export function groupMedia(by: GroupBy, ids: readonly string[], media: Record<string, Media>): Group[] {
  const raw =
    by === "single"
      ? [{ key: "s:all", ids: [...ids] }]
      : by === "day"
        ? runs(ids, (id) => `d:${dayKey(media[id]!.takenAt)}`)
        : by === "time"
          ? byTime(ids, media)
          : byPlace(ids, media);
  return raw.filter((g) => g.ids.length).map((g) => finish(g, media));
}

/** Consecutive ids with the same key, one group each. */
function runs(ids: readonly string[], keyOf: (id: string) => string): { key: string; ids: string[] }[] {
  const out: { key: string; ids: string[] }[] = [];
  for (const id of ids) {
    const key = keyOf(id);
    if (out.at(-1)?.key !== key) out.push({ key, ids: [] });
    out.at(-1)!.ids.push(id);
  }
  return out;
}

/**
 * The gap that separates two moments of a trip, found from the trip itself:
 * gaps are spread over many orders of magnitude (a burst: a second; a walk to
 * the next sight: half an hour), so they are compared on a log scale, around
 * the typical gap (median) and its typical spread (MAD — the few big gaps
 * being looked for must not set the bar themselves). A gap far above the
 * usual starts a new group. Clamped to 30 min … 6 h so a dense day still
 * splits at lunch and a slow one does not split at every photo.
 */
export function timeGap(times: readonly number[]): number {
  const logs: number[] = [];
  for (let i = 1; i < times.length; i++) logs.push(Math.log(Math.max(1000, times[i]! - times[i - 1]!)));
  if (logs.length < 2) return TIME_GAP_MIN;
  const med = median(logs);
  const mad = median(logs.map((l) => Math.abs(l - med))) * 1.4826;
  return Math.min(TIME_GAP_MAX, Math.max(TIME_GAP_MIN, Math.exp(med + 3 * mad)));
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function byTime(ids: readonly string[], media: Record<string, Media>) {
  const times = ids.map((id) => Date.parse(media[id]!.takenAt));
  const gap = timeGap(times);
  const out: { key: string; ids: string[] }[] = [];
  ids.forEach((id, i) => {
    if (i === 0 || times[i]! - times[i - 1]! >= gap) out.push({ key: `t:${id}`, ids: [] });
    out.at(-1)!.ids.push(id);
  });
  return out;
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371;
}

/**
 * Places: a typed place name wins; otherwise GPS, joined to the first earlier
 * place whose middle is within PLACE_RADIUS_KM (so coming back to the hotel in
 * the evening is the hotel again); photos with neither go last, together.
 * Groups are in the order they were first visited.
 */
function byPlace(ids: readonly string[], media: Record<string, Media>) {
  const named = new Map<string, { key: string; ids: string[]; place: string }>();
  const spots: { key: string; ids: string[]; spot: number; lat: number; lng: number; n: number }[] = [];
  const none = { key: "p:none", ids: [] as string[], noPlace: true };
  const out: { key: string; ids: string[]; place?: string; spot?: number; noPlace?: boolean }[] = [];
  for (const id of ids) {
    const m = media[id]!;
    const name = m.place?.trim();
    if (name) {
      const k = name.toLowerCase();
      let g = named.get(k);
      if (!g) {
        g = { key: `p:${k}`, ids: [], place: name };
        named.set(k, g);
        out.push(g);
      }
      g.ids.push(id);
    } else if (m.gps) {
      let g = spots.find((s) => km(s, m.gps!) <= PLACE_RADIUS_KM);
      if (!g) {
        g = { key: `p:@${spots.length + 1}`, ids: [], spot: spots.length + 1, lat: m.gps.lat, lng: m.gps.lng, n: 0 };
        spots.push(g);
        out.push(g);
      }
      g.ids.push(id);
      g.lat = (g.lat * g.n + m.gps.lat) / (g.n + 1);
      g.lng = (g.lng * g.n + m.gps.lng) / (g.n + 1);
      g.n++;
    } else none.ids.push(id);
  }
  return [...out.map(({ key, ids, place, spot }) => ({ key, ids, place, spot })), none];
}

/** Best first: highest rating, then the earlier shot. */
function better(media: Record<string, Media>) {
  return (a: string, b: string) => media[b]!.rating - media[a]!.rating || media[a]!.takenAt.localeCompare(media[b]!.takenAt);
}

function finish(g: { key: string; ids: string[]; place?: string; spot?: number; noPlace?: boolean }, media: Record<string, Media>): Group {
  const counts = { top: 0, good: 0, bad: 0, unrated: 0 };
  for (const id of g.ids) {
    const r = media[id]!.rating;
    if (r === 2) counts.top++;
    else if (r === 1) counts.good++;
    else if (r === -1) counts.bad++;
    else if (r === 0) counts.unrated++;
  }
  // A discard is never a cover.
  const kept = g.ids.filter((id) => media[id]!.rating > -2);
  const top3 = (kept.length ? kept : g.ids).slice().sort(better(media)).slice(0, 3);
  return { ...g, top3, counts };
}
