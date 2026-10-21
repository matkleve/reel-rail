import { useEffect, useMemo, useRef, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import { ImageOff } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { subscribeThumbs, thumbFor, thumbsVersion } from "@/fs/thumbnails";
import { passes } from "@/store/filters";
import { coverOf, visibleOrder } from "@/store/stacks";
import { useReel } from "@/store/useReel";
import { RATING_LABEL, ratingClass, type Rating } from "@/types";
import { useSize } from "@/ui/useSize";

import { Card } from "./Card";
import { TOGGLE_PLAY } from "./events";
import { SWIPE_MIN } from "./gesture";
import { floorFor, layoutCarousel } from "./layout";
import { useInsets } from "./useInsets";
import { useSwipe } from "./useSwipe";

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Wheel/trackpad travel per step through the carousel. */
const WHEEL_STEP = 70;

/**
 * The stage: cards side by side on a slightly tilted floor, current one in the
 * middle. Only the ~20 cards around the current one exist in the DOM, so the
 * folder size does not matter.
 */
export function Carousel() {
  const s = useReel(
    useShallow((x) => ({
      order: x.order,
      stacks: x.stacks,
      expanded: x.expanded,
      currentId: x.currentId,
      selection: x.selection,
      filters: x.filters,
      media: x.reel.media,
      presets: x.reel.tagPresets,
    })),
  );
  const stage = useRef<HTMLDivElement>(null);
  const size = useSize(stage);
  const thumbs = useSyncExternalStore(subscribeThumbs, thumbsVersion);

  const ids = useMemo(() => visibleOrder(s.order, s.stacks, s.expanded, s.media), [s.order, s.stacks, s.expanded, s.media]);
  // A current item hidden in a collapsed burst is represented by the burst's cover.
  const sid = s.currentId ? s.stacks.stackOf[s.currentId] : undefined;
  const shownId =
    s.currentId && sid && !s.expanded.has(sid) ? coverOf(s.stacks.members[sid]!, s.media) : s.currentId;
  const index = shownId ? ids.indexOf(shownId) : -1;

  const insets = useInsets(stage, [size.w, size.h, s.currentId === undefined]);
  const box = useMemo(() => ({ ...size, ...insets }), [size, insets]);

  const layout = useMemo(
    () => layoutCarousel(ids, index, s.media, (id) => thumbFor(id)?.aspect, box),
    // `thumbs` is the version counter: card widths follow the real aspect ratios as they load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, index, s.media, box, thumbs],
  );

  useWheelSteps(stage);
  const drag = useSwipe(stage);
  const current = shownId ? s.media[shownId] : undefined;


  return (
    <div
      className={drag ? "stage is-dragging" : "stage"}
      ref={stage}
      style={{
        ["--drag-x" as string]: drag?.axis === "x" ? `${drag.dx * 0.8}px` : "0px",
        ["--drag-y" as string]: drag?.axis === "y" ? `${Math.max(-60, Math.min(60, drag.dy * 0.3))}px` : "0px",
      }}
    >
      <div className="stage-spotlight" />
      <div className="stage-floor" style={{ top: `${floorFor(box) * 100}%` }} />
      <div className="stage-plane">
        {layout.seps.map((sep) => (
          <div key={sep.key} className="day-sep" style={{ transform: `translateX(${sep.x}px)` }}>
            <span>{DAY.format(sep.date)}</span>
          </div>
        ))}
        {layout.cards.map((c) => {
          const m = s.media[c.id]!;
          const stackId = s.stacks.stackOf[c.id];
          return (
            <Card
              key={c.id}
              media={m}
              place={c}
              current={c.d === 0}
              selected={s.selection.has(c.id)}
              dimmed={!passes(m, s.filters)}
              stackCount={stackId && !s.expanded.has(stackId) ? s.stacks.members[stackId]!.length : undefined}
              presets={s.presets}
              onPick={pickCard}
            />
          );
        })}
      </div>
      {drag?.axis === "y" && current && <RatePreview from={current.rating} dy={drag.dy} />}
      {ids.length === 0 && (
        <div className="stage-empty">
          <ImageOff size={28} aria-hidden="true" />
          <p>No photos or videos in this folder yet.</p>
        </div>
      )}
    </div>
  );
}

/** A click/tap on a card. Tapping the playing video pauses it — on a phone the dock has no room for a play button. */
function pickCard(id: string, e: MouseEvent): void {
  const s = useReel.getState();
  const plain = !e.metaKey && !e.ctrlKey && !e.shiftKey;
  if (plain && id === s.currentId && s.reel.media[id]?.type === "video") {
    window.dispatchEvent(new Event(TOGGLE_PLAY));
    return;
  }
  s.setCurrent(id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "extend" : "replace");
}

/** Wheel and two-finger swipes flip through the carousel, one card per notch. */
function useWheelSteps(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      while (Math.abs(acc) >= WHEEL_STEP) {
        useReel.getState().step(acc > 0 ? 1 : -1);
        acc -= Math.sign(acc) * WHEEL_STEP;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}

/** While swiping up / down: the level the current item will get on release. */
function RatePreview({ from, dy }: { from: Rating; dy: number }) {
  const armed = Math.abs(dy) >= SWIPE_MIN;
  const to = Math.max(-2, Math.min(2, from + (dy < 0 ? 1 : -1))) as Rating;
  return (
    <div className={`rate-preview ${ratingClass(to)}${armed ? " is-armed" : ""}`} aria-hidden="true">
      {dy < 0 ? "↑" : "↓"} {to === from ? RATING_LABEL[from] : RATING_LABEL[to]}
    </div>
  );
}
