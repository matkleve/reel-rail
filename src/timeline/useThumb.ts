import { useEffect, useSyncExternalStore } from "react";

import { cancelThumb, requestThumb, subscribeThumbs, thumbFor } from "@/fs/thumbnails";
import type { Media } from "@/types";

/** Thumbnail URL for a mounted item. Unmounting cancels queued work. */
export function useThumb(media: Media): { url?: string; failed?: boolean } {
  const entry = useSyncExternalStore(subscribeThumbs, () => thumbFor(media.id));
  useEffect(() => {
    requestThumb(media);
    return () => cancelThumb(media.id);
    // The id is the identity; a rating change must not re-queue the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id]);
  return entry ?? {};
}
