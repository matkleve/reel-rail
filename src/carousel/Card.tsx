import { memo, type MouseEvent } from "react";

import { PICKS, type Media } from "@/types";
import { CheckIcon, PickIcon, PlayIcon, StarIcon } from "@/ui/icons";
import { tagColor } from "@/ui/tagColor";
import { useThumb } from "@/ui/useThumb";

import type { CardPlace } from "./layout";
import { Original } from "./Original";

type Props = {
  media: Media;
  place: CardPlace;
  current: boolean;
  selected: boolean;
  dimmed: boolean;
  stackCount?: number;
  presets: string[];
  onPick(id: string, e: MouseEvent): void;
};

/** One photo/video standing on the carousel floor. Size and height are its rating. */
export const Card = memo(function Card(p: Props) {
  const { media, place } = p;
  const thumb = useThumb(media);
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const exported = media.exportedTo.some((e) => e.series !== PICKS);
  const cls = [
    "card",
    `r${media.rating < 0 ? "m1" : media.rating}`,
    p.current && "is-current",
    p.selected && "is-selected",
    p.dimmed && "is-dimmed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={{
        width: place.w,
        height: place.h,
        transform: `translate3d(${place.x - place.w / 2}px, ${place.bottom - place.h}px, 0) rotateY(${place.rotY}deg)`,
        zIndex: 100 - Math.abs(place.d),
      }}
    >
      <button
        type="button"
        className="card-face"
        onClick={(e) => p.onPick(media.id, e)}
        aria-label={`${media.type} ${media.path}, rating ${media.rating}${p.stackCount ? `, burst of ${p.stackCount}` : ""}`}
        aria-pressed={p.selected}
        tabIndex={-1}
      >
        {p.stackCount && <span className="card-stack" aria-hidden="true" />}
        {thumb.url ? <img className="card-thumb" src={thumb.url} alt="" draggable={false} /> : <span className="card-ph" />}
        {p.current && <Original media={media} />}
        {media.type === "video" && !p.current && (
          <span className="card-play">
            <PlayIcon size={18} />
          </span>
        )}
      </button>
      {p.stackCount && <span className="card-count">{p.stackCount}</span>}
      <span className="card-badges">
        {media.rating === 2 && (
          <span className="badge star" title="Top">
            <StarIcon size={14} />
          </span>
        )}
        {picked && (
          <span className="badge pick" title="In your picks folder">
            <PickIcon size={13} />
          </span>
        )}
        {exported && (
          <span className="badge done" title="Exported in a series">
            <CheckIcon size={10} />
          </span>
        )}
      </span>
      {media.rating >= 1 && media.tags.length > 0 && (
        <span className="card-tags">
          {media.tags.map((t) => (
            <span key={t} className="tag-chip" style={{ background: tagColor(t, p.presets) }}>
              {t}
            </span>
          ))}
        </span>
      )}
    </div>
  );
});
