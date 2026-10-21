import type { Media } from "@/types";

export type RatingFilter = "all" | "good" | "favorite";
/**
 * `tags`: show media carrying ANY of these (empty = no tag filter).
 * The switches combine with the rating choice.
 */
export type Filters = { rating: RatingFilter; hideDiscards: boolean; neverExported: boolean; tags: string[] };

export const DEFAULT_FILTERS: Filters = { rating: "all", hideDiscards: false, neverExported: false, tags: [] };

/** How many filters besides the rating choice are on — for the filter button's badge. */
export function activeExtras(f: Filters): number {
  return Number(f.hideDiscards) + Number(f.neverExported) + f.tags.length;
}

/**
 * Whether a medium passes the filters. Failing media stay in place (dimmed)
 * so the user keeps their bearings in time — they are only skipped by
 * keyboard navigation.
 */
export function passes(m: Media, f: Filters): boolean {
  if (f.rating === "good" && m.rating < 1) return false;
  if (f.rating === "favorite" && m.rating < 2) return false;
  if (f.hideDiscards && m.rating <= -2) return false;
  if (f.neverExported && m.exportedTo.length > 0) return false;
  if (f.tags.length && !m.tags.some((t) => f.tags.includes(t))) return false;
  return true;
}
