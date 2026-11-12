import { ArrowDownToLine, Check, CircleCheck, Layers, Play, Scissors, Star } from "lucide-react";
import { memo, type CSSProperties, type MouseEvent } from "react";

import { TRIMMABLE } from "@/fs/trimVideo";
import { t } from "@/i18n";
import { useUi } from "@/store/useUi";
import { secondsLeft } from "@/fs/deletion";
import { graceMs } from "@/store/discards";
import { DISCARD, PICKS, RATING_LABEL, ratingClass, type Media } from "@/types";
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
 * One photo/video in the strip. Its rating is a chip in the corner (not its
 * size); brightness falls off with distance from the centre (the spotlight).
 */
export const Card = memo(function Card(p: Props) {
  const { media, place } = p;
  const thumb = useThumb(media);
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const exported = media.exportedTo.some((e) => e.series !== PICKS);
  const cls = ["card", ratingClass(media.rating), p.current && "is-current", p.selected && "is-selected", p.dimmed && "is-dimmed"]
    .filter(Boolean)
    .join(" ");
  const style = placeStyle(place);

  return (
    <div className={cls} style={style} data-id={media.id}>
      <button
        type="button"
        className="card-face"
        onClick={(e) => p.onPick(media.id, e)}
        aria-label={cardLabel(media, p.stackCount)}
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
          label={t("Trim video")}
          kbd="C"
          size="sm"
          variant="secondary"
          onClick={() => useUi.getState().set({ dialog: "trim" })}
        />
      )}
      {media.rating !== 0 && (
        <span className={`card-rating ${ratingClass(media.rating)}`} aria-hidden="true">
          {media.rating === 2 && <Star size={11} fill="currentColor" strokeWidth={0} />}
          {RATING_LABEL[media.rating]}
        </span>
      )}
      {media.rating === DISCARD && media.discardedAt && <Countdown discardedAt={media.discardedAt} />}
      {p.selected && <CircleCheck className="card-check" size={22} fill="var(--select)" color="white" aria-hidden="true" />}
      {p.stackCount && (
        <span className="card-count" aria-hidden="true">
          <Layers size={12} /> {p.stackCount}
        </span>
      )}
      <span className="card-badges" aria-hidden="true">
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

/** Where a card sits. Neighbours lie a little askew, like prints on a table; the current one straight. */
function placeStyle(place: CardPlace): CSSProperties {
  return {
    width: place.w,
    height: place.h,
    transform: `translate3d(${place.x - place.w / 2}px, ${place.bottom - place.h}px, 0) rotate(${Math.sign(place.d) * 1.5}deg)`,
    zIndex: 100 - Math.abs(place.d),
    "--x": `${place.x}px`, // for the day fan-out (days.css)
    "--fan-i": Math.min(6, Math.abs(place.d)),
    "--dim": Math.max(0.35, 1 - Math.abs(place.d) * 0.16),
  } as CSSProperties;
}

function cardLabel(media: Media, stackCount?: number): string {
  const vars = { path: media.path, rating: media.rating };
  const what = media.type === "video" ? t("video {path}, rating {rating}", vars) : t("photo {path}, rating {rating}", vars);
  return stackCount ? what + t(", burst of {n}", { n: stackCount }) : what;
}

/**
 * A discard's undo window: the bar runs out, then the card leaves the rail.
 * Pure CSS from the time left at render — no timer per card.
 */
function Countdown({ discardedAt }: { discardedAt: string }) {
  const grace = graceMs() / 1000;
  const left = secondsLeft({ rating: DISCARD, discardedAt } as Media, Date.now(), graceMs());
  return (
    <span
      className="card-countdown"
      role="timer"
      aria-label={t("Leaves in {n} s — rate it up to keep it", { n: Math.ceil(left) })}
      style={{ "--grace": `${grace}s`, "--elapsed": `${grace - left}s` } as CSSProperties}
    />
  );
}
