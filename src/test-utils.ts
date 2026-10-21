import type { Media } from "@/types";

/** A Media with sensible defaults — tests state only what they are about. */
export function media(id: string, patch: Partial<Media> = {}): Media {
  return {
    id,
    path: `trip/${id}.jpg`,
    type: "photo",
    takenAt: "2026-10-14T10:00:00.000Z",
    rating: 0,
    tags: [],
    exportedTo: [],
    ...patch,
  };
}
