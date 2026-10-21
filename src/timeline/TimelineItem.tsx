import { memo, type MouseEvent } from "react";

import type { Media } from "@/types";
import { CheckIcon, PlayIcon, StarIcon } from "@/ui/icons";

import type { MediaSlot } from "./layout";
import { useThumb } from "./useThumb";

type Props = {
  media: Media;
  slot: MediaSlot;
  left: number;
  lineY: number;
  current: boolean;
  selected: boolean;
  dimmed: boolean;
  onPick(id: string, e: MouseEvent): void;
};

/** One medium sitting on the rail. Its size is its rating. */
export const TimelineItem = memo(function TimelineItem(p: Props) {
  const { media, slot } = p;
  const thumb = useThumb(media);
  const unusable = media.rating < 0;
  // Unusable items slip just below the line; everything else stands on it.
  const top = unusable ? p.lineY + 6 : p.lineY - slot.w;

  const cls = [
    "tl-item",
    `r${media.rating < 0 ? "m1" : media.rating}`,
    p.current && "is-current",
    p.selected && "is-selected",
    p.dimmed && "is-dimmed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      style={{ transform: `translate(${p.left}px, ${top}px)`, width: slot.w, height: slot.w }}
      onClick={(e) => p.onPick(media.id, e)}
      aria-label={`${media.type} ${media.path}, rating ${media.rating}`}
      aria-pressed={p.selected}
      tabIndex={-1}
    >
      {thumb.url ? (
        <img src={thumb.url} alt="" draggable={false} />
      ) : (
        <span className={thumb.failed ? "tl-ph is-failed" : "tl-ph"} />
      )}
      {media.type === "video" && !unusable && (
        <span className="tl-play">
          <PlayIcon size={slot.w > 60 ? 16 : 11} />
        </span>
      )}
      {media.rating === 2 && (
        <span className="tl-star">
          <StarIcon size={13} />
        </span>
      )}
      {media.exportedTo.length > 0 && !unusable && (
        <span className="tl-exported" title="Already exported">
          <CheckIcon size={8} />
        </span>
      )}
    </button>
  );
});
