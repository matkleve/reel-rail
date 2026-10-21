import type { Media, Rating, ReelFile } from "@/types";

/**
 * Rating sync (Pro) — rules, kept pure so they can be tested.
 *
 * What syncs: rating, tags and place, keyed by content id. Never files,
 * names or paths. Newer side wins per item (`changedAt` here, `updated_at`
 * there). A discard that arrives starts its countdown from when it was
 * discarded on the other device — so rating on the phone cleans up the folder
 * on the computer (through "Recently deleted", restorable for 30 days).
 */

export type RemoteRating = {
  media_id: string;
  rating: Rating;
  tags: string[];
  place: string | null;
  updated_at: string;
};

/** Local decisions changed since the last push. */
export function toPush(reel: ReelFile, since: string | undefined): RemoteRating[] {
  return Object.values(reel.media)
    .filter((m) => m.changedAt && (!since || m.changedAt > since))
    .map((m) => ({ media_id: m.id, rating: m.rating, tags: m.tags, place: m.place ?? null, updated_at: m.changedAt! }));
}

/** Remote decisions that are newer than what is here, applied. Returns the ids that changed. */
export function applyRemote(reel: ReelFile, rows: RemoteRating[]): { reel: ReelFile; changed: string[] } {
  const media = { ...reel.media };
  const changed: string[] = [];
  for (const r of rows) {
    const m = media[r.media_id];
    if (!m || (m.changedAt && m.changedAt >= r.updated_at)) continue;
    const next: Media = { ...m, rating: r.rating, tags: r.tags, changedAt: r.updated_at };
    if (r.place) next.place = r.place;
    else delete next.place;
    if (r.rating === -2) next.discardedAt ??= r.updated_at;
    else delete next.discardedAt;
    media[r.media_id] = next;
    changed.push(r.media_id);
  }
  return { reel: changed.length ? { ...reel, media } : reel, changed };
}
