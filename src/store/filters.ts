import type { Media } from "@/types";

export type RatingFilter = "all" | "like" | "top" | "hideUnusable";
/** `tags`: show media carrying ANY of these (empty = no tag filter). */
export type Filters = { rating: RatingFilter; neverExported: boolean; tags: string[] };

export const DEFAULT_FILTERS: Filters = { rating: "all", neverExported: false, tags: [] };

/**
 * Whether a medium passes the filter bar. Failing media stay on the timeline
 * (greyed out) so the user keeps their bearings in time — they are only
 * skipped by keyboard navigation.
 */
export function passes(m: Media, f: Filters): boolean {
  if (f.rating === "like" && m.rating < 1) return false;
  if (f.rating === "top" && m.rating < 2) return false;
  if (f.rating === "hideUnusable" && m.rating < 0) return false;
  if (f.neverExported && m.exportedTo.length > 0) return false;
  if (f.tags.length && !m.tags.some((t) => f.tags.includes(t))) return false;
  return true;
}
