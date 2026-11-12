import type { Media } from "@/types";

/**
 * The phone timeline as days (D-031): every day one stack — its best photo on
 * top — that fans out into the day's photos when tapped. Pure: grouping and
 * the cover; the screen is DayPiles, the open day lives in useUi.
 */

export type Day = {
  /** "YYYY-MM-DD" in local time — the day a person means, not UTC. */
  key: string;
  ids: string[];
  /** The photos on top of the stack, best first (cover + the two peeking out). */
  top3: string[];
  counts: { top: number; good: number; bad: number; unrated: number };
};

export function dayKey(takenAt: string): string {
  const d = new Date(takenAt);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Noon of a day key, for formatting it (noon: no time zone edge pulls it to the day before). */
export function dayDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12);
}

/** Best first: highest rating, then the earlier shot. */
function better(media: Record<string, Media>) {
  return (a: string, b: string) => media[b]!.rating - media[a]!.rating || media[a]!.takenAt.localeCompare(media[b]!.takenAt);
}

/** `ids` in time order → one Day per calendar day, in order. Discards are left out of the cover and counts. */
export function groupDays(ids: readonly string[], media: Record<string, Media>): Day[] {
  const days: Day[] = [];
  for (const id of ids) {
    const key = dayKey(media[id]!.takenAt);
    let day = days.at(-1);
    if (!day || day.key !== key) {
      day = { key, ids: [], top3: [], counts: { top: 0, good: 0, bad: 0, unrated: 0 } };
      days.push(day);
    }
    day.ids.push(id);
    const r = media[id]!.rating;
    if (r === 2) day.counts.top++;
    else if (r === 1) day.counts.good++;
    else if (r === -1) day.counts.bad++;
    else if (r === 0) day.counts.unrated++;
  }
  for (const day of days) {
    const kept = day.ids.filter((id) => media[id]!.rating > -2);
    day.top3 = (kept.length ? kept : day.ids).slice().sort(better(media)).slice(0, 3);
  }
  return days;
}
