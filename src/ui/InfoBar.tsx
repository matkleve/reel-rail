import { useEffect, useRef, useState } from "react";

import { setPlace } from "@/store/actions";
import { targetIds, useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { RATING_LABEL, ratingClass } from "@/types";
import { StarIcon } from "@/ui/icons";

import { TagEditor } from "./TagEditor";

const WHEN = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Facts about the current medium, the editable place, and the selection's actions. */
export function InfoBar() {
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  const selected = useReel((s) => s.selection.size);
  const order = useReel((s) => s.order);
  const setDialog = (dialog: "createSeries") => useUi.getState().set({ dialog });

  if (!media) return <div className="infobar" />;
  const index = order.indexOf(media.id) + 1;

  return (
    <div className="infobar">
      <div className="info-left">
        <span className="tabular muted">
          {index} / {order.length}
        </span>
        <span>{WHEN.format(new Date(media.takenAt))}</span>
        <PlaceField key={media.id} value={media.place ?? ""} />
        <TagEditor media={media} />
        <span className="muted path" title={media.path}>
          {media.path}
        </span>
      </div>
      <div className="info-right">
        <span className={`rating-pill ${ratingClass(media.rating)}`}>
          {media.rating === 2 && <StarIcon size={12} />} {RATING_LABEL[media.rating]}
        </span>
        {selected > 0 && (
          <>
            <span className="muted tabular">{selected} selected</span>
            <button className="btn btn-primary" onClick={() => setDialog("createSeries")}>
              Create series <kbd>S</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Commits on Enter/blur; applies to the whole selection when there is one. */
function PlaceField({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const focusTick = useUi((s) => s.placeFocus);
  // The field remounts per medium; only a P pressed *after* mounting may focus
  // it — otherwise the last P would steal focus on every arrow key.
  const mountedTick = useRef(focusTick);

  useEffect(() => {
    if (focusTick !== mountedTick.current) input.current?.select();
  }, [focusTick]);

  const commit = () => {
    const s = useReel.getState();
    if (draft.trim() !== value) setPlace(targetIds(s), draft);
  };

  return (
    <input
      ref={input}
      className="place-input"
      value={draft}
      placeholder="Add place (P)"
      aria-label="Place"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") input.current?.blur();
        if (e.key === "Escape") {
          setDraft(value);
          requestAnimationFrame(() => input.current?.blur());
        }
        e.stopPropagation();
      }}
    />
  );
}
