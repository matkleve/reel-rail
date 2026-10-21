import type { Media } from "@/types";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** Folder names cameras and phones invent — never a meaningful place. */
const GENERIC_DIR = /^(dcim|\d{3}[a-z_]*|camera|camera roll|photos?|videos?|images?|pictures|export|import|media|raw|jpe?g|mov|mp4|\d{4}([-_.]\d{2}){0,2})$/i;

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let max = 0;
  for (const [v, n] of counts) if (n > max) [best, max] = [v, n];
  return best;
}

/** The place of a selection: edited `place` first, else a telling folder name. */
export function placeOf(media: Media[]): string | undefined {
  const edited = mostCommon(media.map((m) => m.place).filter((p): p is string => !!p));
  if (edited) return edited;
  const dirs = media.flatMap((m) => {
    const parts = m.path.split("/").slice(0, -1).reverse();
    const telling = parts.find((p) => !GENERIC_DIR.test(p));
    return telling ? [telling] : [];
  });
  return mostCommon(dirs);
}

export function topTag(media: Media[]): string | undefined {
  return mostCommon(media.flatMap((m) => m.tags));
}

/** "Oct 26" from the median capture date (robust against one stray old photo). */
export function monthYear(media: Media[]): string | undefined {
  if (!media.length) return undefined;
  const sorted = media.map((m) => m.takenAt).sort();
  const d = new Date(sorted[Math.floor(sorted.length / 2)]!);
  return `${MONTH.format(d)} ${String(d.getFullYear()).slice(-2)}`;
}

/** e.g. "Porto – Tram – Oct 26". Missing parts are left out, never invented. */
export function suggestTitle(media: Media[]): string {
  const parts = [placeOf(media), topTag(media), monthYear(media)].filter(Boolean);
  return parts.length ? parts.join(" – ") : "New series";
}

const ADJECTIVES = [
  "Sun-Drunk", "Salty", "Wobbly", "Golden", "Sleepless", "Wind-Blown", "Caffeinated",
  "Slightly Lost", "Glorious", "Sticky", "Barefoot", "Cosmic", "Sneaky", "Lazy",
  "Breezy", "Fearless", "Dusty", "Hungry", "Electric", "Unhinged",
];
const NOUNS = [
  "Escapades", "Wanderings", "Shenanigans", "Detours", "Adventures", "Chronicles",
  "Diaries", "Ramblings", "Tales", "Moments", "Expeditions", "Side Quests",
];
const PATTERNS = [
  (a: string, s: string, n: string) => `${a} ${s} ${n}`,
  (a: string, s: string) => `${s}, but ${a.toLowerCase()}`,
  (a: string, s: string, n: string) => `The ${a} ${n} of ${s}`,
  (a: string, s: string) => `${a} in ${s}`,
  (a: string, s: string, n: string) => `${s}: ${a} ${n}`,
];

/** A playful alternative title from a local word list. `rand` is injectable for tests. */
export function funnyTitle(media: Media[], rand: () => number = Math.random): string {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const subjects = [placeOf(media), topTag(media)].filter((s): s is string => !!s);
  const subject = subjects.length ? pick(subjects) : "Somewhere";
  return pick(PATTERNS)(pick(ADJECTIVES), subject, pick(NOUNS));
}
