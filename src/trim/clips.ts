import type { TrimRange } from "@/fs/trimVideo";
import { DISCARD, type Rating } from "@/types";

/**
 * Several clips out of one video (UC-007) — the pure part: where a new clip
 * goes, their order, their file names, what they inherit.
 */

/** A new clip starts at the playhead and runs this long (or to the end). */
export const NEW_CLIP_S = 5;

/** A new clip at `at`: NEW_CLIP_S long (the whole video if shorter), pulled back from the end to keep its length. */
export function clipAt(at: number, duration: number): TrimRange {
  const len = Math.min(NEW_CLIP_S, duration);
  const start = Math.max(0, Math.min(at, duration - len));
  return { start, end: start + len };
}

/** Clips in the order they happen in the video — the order the files are written and numbered. */
export function inOrder(clips: readonly TrimRange[]): TrimRange[] {
  return [...clips].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The clip under `t` (the latest-starting one where clips overlap), or -1. */
export function clipIndexAt(clips: readonly TrimRange[], t: number): number {
  let found = -1;
  clips.forEach((c, i) => {
    if (t >= c.start && t <= c.end && (found < 0 || c.start >= clips[found]!.start)) found = i;
  });
  return found;
}

/** Total seconds kept, overlaps counted once. */
export function keptSeconds(clips: readonly TrimRange[]): number {
  let total = 0;
  let reach = -Infinity;
  for (const c of inOrder(clips)) {
    const from = Math.max(c.start, reach);
    if (c.end > from) total += c.end - from;
    reach = Math.max(reach, c.end);
  }
  return total;
}

/**
 * The file name of clip `n` of `total`: one clip is "-trimmed" (as a plain
 * trim always was), several are "-clip1", "-clip2" … in video order.
 */
export function clipFileName(original: string, n: number, total: number): string {
  const dot = original.lastIndexOf(".");
  const base = dot > 0 ? original.slice(0, dot) : original;
  const ext = dot > 0 ? original.slice(dot) : "";
  return total === 1 ? `${base}-trimmed${ext}` : `${base}-clip${n}${ext}`;
}

/** A clip of a video rated "delete" starts unrated: you cut it out because something in it was worth keeping. */
export function clipRating(original: Rating): Rating {
  return original === DISCARD ? 0 : original;
}

/** The stretches no clip keeps — shaded on the track. */
export function gaps(clips: readonly TrimRange[], duration: number): TrimRange[] {
  const out: TrimRange[] = [];
  let at = 0;
  for (const c of inOrder(clips)) {
    if (c.start > at) out.push({ start: at, end: c.start });
    at = Math.max(at, c.end);
  }
  if (duration > at) out.push({ start: at, end: duration });
  return out;
}
