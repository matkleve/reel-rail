import { ArrowDownToLine, Check, CircleCheck, Layers, Play, Scissors, Star } from "lucide-react";
import { memo, type CSSProperties, type MouseEvent } from "react";

import { TRIMMABLE } from "@/fs/trimVideo";
import { useUi } from "@/store/useUi";
import { PICKS, ratingClass, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { tagStyle } from "@/ui/tagColor";
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

/**
 * One photo/video standing on the floor. Size and height are its rating;
 * brightness falls off with distance from the centre (the spotlight).
 */
export const Card = memo(function Card(p: Props) {
  const { media, place } = p;
  const thumb = useThumb(media);
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const exported = media.exportedTo.some((e) => e.series !== PICKS);
  const cls = ["card", ratingClass(media.rating), p.current && "is-current", p.selected && "is-selected", p.dimmed && "is-dimmed"]
    .filter(Boolean)
    .join(" ");
  const style = {
    width: place.w,
    height: place.h,
    transform: `translate3d(${place.x - place.w / 2}px, ${place.bottom - place.h}px, 0) rotateY(${place.rotY}deg)`,
    zIndex: 100 - Math.abs(place.d),
    "--dim": Math.max(0.35, 1 - Math.abs(place.d) * 0.16),
  } as CSSProperties;

  return (
    <div className={cls} style={style} data-id={media.id}>
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
          <span className="card-play" aria-hidden="true">
            <Play size={16} fill="currentColor" />
          </span>
        )}
      </button>

      {p.current && media.type === "video" && TRIMMABLE.test(media.path) && (
        <Button
          className="card-trim"
          icon={Scissors}
          label="Trim video"
          kbd="C"
          size="sm"
          variant="secondary"
          onClick={() => useUi.getState().set({ dialog: "trim" })}
        />
      )}
      {p.selected && <CircleCheck className="card-check" size={22} fill="var(--select)" color="white" aria-hidden="true" />}
      {p.stackCount && (
        <span className="card-count" aria-hidden="true">
          <Layers size={12} /> {p.stackCount}
        </span>
      )}
      <span className="card-badges" aria-hidden="true">
        {media.rating === 2 && (
          <span className="badge is-fav">
            <Star size={12} fill="currentColor" strokeWidth={0} />
          </span>
        )}
        {picked && (
          <span className="badge is-pick">
            <ArrowDownToLine size={12} strokeWidth={2.6} />
          </span>
        )}
        {exported && (
          <span className="badge is-done">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>
      {media.rating >= 1 && media.tags.length > 0 && (
        <span className="card-tags" aria-hidden="true">
          {media.tags.map((t) => (
            <span key={t} className="tag-dot" style={tagStyle(t, p.presets)} title={t} />
          ))}
        </span>
      )}
    </div>
  );
});
