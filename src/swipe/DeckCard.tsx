import { ArrowDownToLine, Check, Layers, MapPin, Play, Scissors, Tag as TagIcon } from "lucide-react";
import type { CSSProperties, HTMLAttributes } from "react";

import { Original } from "@/carousel/Original";
import { TRIMMABLE } from "@/fs/trimVideo";
import { togglePick } from "@/store/picks";
import { useUi } from "@/store/useUi";
import { PICKS, RATING_LABEL, ratingClass, type Media } from "@/types";
import { Popover } from "@/ui/kit/Popover";
import { PlaceField } from "@/ui/StageOverlay";
import { TagPanel } from "@/ui/TagMenu";
import { tagStyle } from "@/ui/tagColor";
import { useThumb } from "@/ui/useThumb";

import { leanOf, type Verdict } from "./deckGesture";
import type { DeckDrag } from "./useDeckDrag";

const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STAMPS: { verdict: Verdict; label: string }[] = [
  { verdict: "good", label: "Good" },
  { verdict: "bad", label: "Bad" },
  { verdict: "top", label: "Top" },
  { verdict: "delete", label: "Delete" },
];

const UPRIGHT: Record<Verdict, number> = { good: 0, bad: 0, top: 0, delete: 0 };

type Props = {
  media: Media;
  /** The card you are deciding on; the other one waits underneath. */
  top: boolean;
  drag: DeckDrag;
  leaving?: Verdict;
  stackCount?: number;
  presets: string[];
  handlers?: HTMLAttributes<HTMLDivElement>;
};

/**
 * One photo/video on the deck, as a print: a frame, the whole photo (contain,
 * over a blurred copy of itself — a landscape shot is rated as taken, not as
 * a crop), and the caption underneath.
 */
export function DeckCard({ media, top, drag, leaving, stackCount, presets, handlers }: Props) {
  const thumb = useThumb(media);
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const lean = leaving ? { ...UPRIGHT, [leaving]: 1 } : top ? leanOf(drag.dx, drag.dy) : UPRIGHT;
  const cls = ["deck-card", top ? "is-top" : "is-next", drag.active && top && "is-dragging", leaving && `is-leaving-${leaving}`]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--dx": `${top ? drag.dx : 0}px`,
    "--dy": `${top ? drag.dy : 0}px`,
    // The card tilts as it is thrown sideways, like one held at the bottom.
    "--rot": `${top ? drag.dx / 18 : 0}deg`,
    "--good": lean.good,
    "--bad": lean.bad,
    "--top": lean.top,
    "--delete": lean.delete,
  } as CSSProperties;

  return (
    <div className={cls} style={style} data-id={media.id} aria-hidden={!top} {...(top ? handlers : {})}>
      <div className="deck-print">
        {thumb.url && <img className="deck-fill" src={thumb.url} alt="" draggable={false} />}
        {thumb.url ? <img className="deck-photo" src={thumb.url} alt="" draggable={false} /> : <span className="card-ph" />}
        {top && <Original media={media} />}

        {stackCount && (
          <span className="deck-chip deck-burst">
            <Layers size={13} aria-hidden="true" /> {stackCount}
          </span>
        )}
        {media.type === "video" && !top && (
          <span className="deck-chip deck-video" aria-hidden="true">
            <Play size={13} fill="currentColor" />
          </span>
        )}
        {top && <CardTools media={media} picked={picked} />}

        {STAMPS.map((s) => (
          <span key={s.verdict} className={`deck-stamp is-${s.verdict}`} aria-hidden="true">
            {s.label}
          </span>
        ))}
      </div>

      <Caption media={media} top={top} presets={presets} />
    </div>
  );
}

/** The caption under the print, like a Polaroid — not over the photo. */
function Caption({ media, top, presets }: { media: Media; top: boolean; presets: string[] }) {
  return (
    <div className="deck-info">
      <div className="deck-when tabular">
        {WHEN.format(new Date(media.takenAt))}
        {media.rating !== 0 && <span className={`deck-rating ${ratingClass(media.rating)}`}>{RATING_LABEL[media.rating]}</span>}
      </div>
      {top ? (
        <PlaceField key={media.id} value={media.place ?? ""} />
      ) : (
        media.place && (
          <span className="place-field">
            <MapPin size={13} aria-hidden="true" />
            {media.place}
          </span>
        )
      )}
      {media.tags.length > 0 && (
        <div className="deck-tags">
          {media.tags.map((t) => (
            <span key={t} className="tag" style={tagStyle(t, presets)}>
              <span>{t}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * What the item needs besides a verdict, on the card itself: pick, tags, and
 * the scissors for a video that can be trimmed.
 */
function CardTools({ media, picked }: { media: Media; picked: boolean }) {
  return (
    <div className="deck-tools">
      <button
        type="button"
        className={picked ? "deck-tool is-picked" : "deck-tool"}
        aria-pressed={picked}
        aria-label={picked ? "Picked — tap to unpick" : "Pick"}
        onClick={() => void togglePick()}
      >
        {picked ? <Check size={18} strokeWidth={3} /> : <ArrowDownToLine size={18} />}
      </button>
      <Popover
        side="below"
        align="end"
        className="tag-menu"
        trigger={(p) => (
          <button type="button" className="deck-tool" aria-label="Tags" {...p}>
            <TagIcon size={18} />
          </button>
        )}
      >
        <TagPanel />
      </Popover>
      {media.type === "video" && TRIMMABLE.test(media.path) && (
        <button type="button" className="deck-tool" aria-label="Trim video" onClick={() => useUi.getState().set({ dialog: "trim" })}>
          <Scissors size={18} />
        </button>
      )}
    </div>
  );
}
