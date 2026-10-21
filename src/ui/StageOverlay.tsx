import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isTouch } from "@/fs/support";
import { setPlace } from "@/store/actions";
import { targetIds, useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { Button } from "./kit/Button";
import { Kbd } from "./kit/Kbd";

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const HINTS_KEY = "reel-rail:hints-dismissed";

/**
 * Where and when, over the stage — typographic, out of the photo's way.
 * The place is edited right here (click, or P).
 */
export function StageOverlay() {
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  const index = useReel((s) => (s.currentId ? s.order.indexOf(s.currentId) : -1));
  const total = useReel((s) => s.order.length);
  if (!media) return null;
  const t = new Date(media.takenAt);
  const name = media.path.slice(media.path.lastIndexOf("/") + 1);

  return (
    <>
      <div className="stage-meta">
        <h1 className="stage-date">{DATE.format(t)}</h1>
        <div className="stage-sub">
          <span className="tabular">{TIME.format(t)}</span>
          <span className="dot-sep" />
          <PlaceField key={media.id} value={media.place ?? ""} />
          <span className="dot-sep" />
          <span className="stage-file" title={media.path}>
            {name}
          </span>
        </div>
      </div>
      <div className="stage-count tabular" aria-label={`Item ${index + 1} of ${total}`}>
        <strong>{index + 1}</strong> / {total}
      </div>
      <Hints />
    </>
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
    <label className="place-field">
      <MapPin size={13} aria-hidden="true" />
      <input
        ref={input}
        value={draft}
        placeholder="Add place"
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
    </label>
  );
}

/** First-run hint: the four keys that do 90 % of the work. Dismissed for good with ×. */
function Hints() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HINTS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(HINTS_KEY, "1");
    } catch {
      // Private mode: hidden for this session only.
    }
  };
  if (isTouch()) {
    return (
      <div className="hints" role="note">
        <span>Swipe ← → to browse</span>
        <span>↑ ↓ to rate</span>
        <span>Hold to select</span>
        <Button icon={X} label="Hide hints" size="sm" onClick={dismiss} />
      </div>
    );
  }
  return (
    <div className="hints" role="note">
      <span>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd> browse
      </span>
      <span>
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> rate
      </span>
      <span>
        <Kbd>Space</Kbd> pick
      </span>
      <span>
        <Kbd>?</Kbd> all keys
      </span>
      <Button icon={X} label="Hide hints" size="sm" onClick={dismiss} />
    </div>
  );
}
