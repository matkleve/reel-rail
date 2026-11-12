import { ArrowDownToLine, Check, MapPin, Play, Scissors, Tag as TagIcon } from "lucide-react";
import { useState, type CSSProperties, type HTMLAttributes, type Ref, type SyntheticEvent } from "react";

import { Original } from "@/carousel/Original";
import { TRIMMABLE } from "@/fs/trimVideo";
import { locale, t } from "@/i18n";
import { togglePick } from "@/store/picks";
import { useUi } from "@/store/useUi";
import { PICKS, RATING_LABEL, ratingClass, type Media } from "@/types";
import { Popover } from "@/ui/kit/Popover";
import { PlaceField } from "@/ui/StageOverlay";
import { TagPanel } from "@/ui/TagMenu";
import { tagStyle } from "@/ui/tagColor";
import { useThumb } from "@/ui/useThumb";

import type { Verdict } from "./deckGesture";
import type { Exit } from "./flyOut";

const WHEN = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const STAMPS: Verdict[] = ["good", "bad", "top", "delete"];
const STAMP_LABEL: Record<Verdict, string> = { good: t("Good"), bad: t("Bad"), top: t("Top"), delete: t("Delete") };

/**
 * Each photo's shape, once its preview has loaded — the frame is cut to it.
 * Kept across cards: the card underneath learns its shape before it is on top.
 */
const aspects = new Map<string, number>();
const DEFAULT_ASPECT = 3 / 4;
const clampAspect = (a: number) => Math.min(2.2, Math.max(0.45, a));

type Props = {
  media: Media;
  /** The card you are deciding on; the other one waits underneath. */
  top: boolean;
  dragging?: boolean;
  leaving?: { verdict: Verdict; exit: Exit };
  presets: string[];
  handlers?: HTMLAttributes<HTMLDivElement>;
  cardRef?: Ref<HTMLDivElement>;
};

/**
 * One photo/video on the deck, as a print: the frame hugs the photo (a
 * portrait shot gets a tall print, a landscape one a wide print — no blurred
 * side bars), the caption underneath.
 *
 * Drag position and lean are CSS variables written by useDeckDrag; this
 * component only renders when the card changes, not while it moves.
 */
export function DeckCard({ media, top, dragging, leaving, presets, handlers, cardRef }: Props) {
  const thumb = useThumb(media);
  const [aspect, setAspect] = useState(() => aspects.get(media.id) ?? DEFAULT_ASPECT);
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const learn = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    const a = clampAspect(w / h);
    aspects.set(media.id, a);
    setAspect(a);
  };
  const cls = ["deck-card", top ? "is-top" : "is-next", dragging && "is-dragging", leaving && `is-leaving is-leaving-${leaving.verdict}`]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--aspect": aspect,
    ...(leaving && {
      "--out-x": `${leaving.exit.x}px`,
      "--out-y": `${leaving.exit.y}px`,
      "--out-rot": `${leaving.exit.rot}deg`,
      ...Object.fromEntries(STAMPS.map((v) => [`--${v}`, v === leaving.verdict ? 1 : 0])),
    }),
  } as CSSProperties;

  return (
    <div ref={cardRef} className={cls} style={style} data-id={media.id} aria-hidden={!top} {...(top ? handlers : {})}>
      <div className="deck-print">
        {thumb.url ? (
          <img className="deck-photo" src={thumb.url} alt="" draggable={false} onLoad={learn} />
        ) : (
          <span className="card-ph" />
        )}
        {top && <Original media={media} />}

        {media.type === "video" && !top && (
          <span className="deck-chip deck-video" aria-hidden="true">
            <Play size={13} fill="currentColor" />
          </span>
        )}
        {top && <CardTools media={media} picked={picked} />}

        {STAMPS.map((v) => (
          <span key={v} className={`deck-stamp is-${v}`} aria-hidden="true">
            {STAMP_LABEL[v]}
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
          {media.tags.map((tag) => (
            <span key={tag} className="tag" style={tagStyle(tag, presets)}>
              <span>{tag}</span>
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
        aria-label={picked ? t("Picked — tap to unpick") : t("Pick")}
        onClick={() => void togglePick()}
      >
        {picked ? <Check size={18} strokeWidth={3} /> : <ArrowDownToLine size={18} />}
      </button>
      <Popover
        side="below"
        align="end"
        className="tag-menu"
        trigger={(p) => (
          <button type="button" className="deck-tool" aria-label={t("Tags")} {...p}>
            <TagIcon size={18} />
          </button>
        )}
      >
        <TagPanel />
      </Popover>
      {media.type === "video" && TRIMMABLE.test(media.path) && (
        <button type="button" className="deck-tool" aria-label={t("Trim video")} onClick={() => useUi.getState().set({ dialog: "trim" })}>
          <Scissors size={18} />
        </button>
      )}
    </div>
  );
}
