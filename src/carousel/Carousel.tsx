import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";

import { subscribeThumbs, thumbFor, thumbsVersion } from "@/fs/thumbnails";
import { passes } from "@/store/filters";
import { coverOf, visibleOrder } from "@/store/stacks";
import { useReel } from "@/store/useReel";
import { useSize } from "@/ui/useSize";

import { Card } from "./Card";
import { layoutCarousel } from "./layout";

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
      setCurrent: x.setCurrent,
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

  const layout = useMemo(
    () => layoutCarousel(ids, index, s.media, (id) => thumbFor(id)?.aspect, size),
    // `thumbs` is the version counter: card widths follow the real aspect ratios as they load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, index, s.media, size, thumbs],
  );

  useWheelSteps(stage);

  const { setCurrent } = s;
  const onPick = useCallback(
    (id: string, e: MouseEvent) => setCurrent(id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "extend" : "replace"),
    [setCurrent],
  );

  return (
    <div className="stage" ref={stage}>
      <div className="stage-floor" />
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
              onPick={onPick}
            />
          );
        })}
      </div>
      {ids.length === 0 && <p className="stage-empty muted">No photos or videos in this folder yet.</p>}
    </div>
  );
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
