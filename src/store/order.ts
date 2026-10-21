import type { Media } from "@/types";

/** Chronological order of the visible (non-missing) media; path breaks ties. */
export function chronological(media: Record<string, Media>): string[] {
  return Object.values(media)
    .filter((m) => !m.missing)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.path.localeCompare(b.path))
    .map((m) => m.id);
}

/** Inclusive id range between two positions in `order`. */
export function rangeBetween(order: string[], a: string, b: string): string[] {
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  if (i < 0 || j < 0) return [b];
  return order.slice(Math.min(i, j), Math.max(i, j) + 1);
}
