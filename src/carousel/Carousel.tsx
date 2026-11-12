import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import { ImageOff } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { subscribeThumbs, thumbFor, thumbsVersion } from "@/fs/thumbnails";
import { locale, t } from "@/i18n";
import { passes } from "@/store/filters";
import { coverOf, visibleOrder } from "@/store/stacks";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { dayKey } from "@/timeline/days";
import { openDay, unfoldBursts } from "@/timeline/dayMode";
import { RATING_LABEL, ratingClass, type Rating } from "@/types";
import { PHONE, useMedia } from "@/ui/useMedia";
import { useSize } from "@/ui/useSize";

import { Card } from "./Card";
import { TOGGLE_PLAY } from "./events";
import { SWIPE_MIN } from "./gesture";
import { layoutCarousel } from "./layout";
import { useInsets } from "./useInsets";
import { useSwipe } from "./useSwipe";

const DAY = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });

/** Wheel/trackpad travel per step through the carousel. */
const WHEEL_STEP = 70;

/**
 * The stage: a flat strip of cards side by side, the current one big in the
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

  const { day, ids } = useStripIds(s);
  const fanning = useDayFollow(day, s.currentId ? s.media[s.currentId]?.takenAt : undefined, s.stacks);
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
      className={["stage", drag && "is-dragging", fanning && "is-fanning"].filter(Boolean).join(" ")}
      ref={stage}
      style={{
        ["--drag-x" as string]: drag?.axis === "x" ? `${drag.dx * 0.8}px` : "0px",
        ["--drag-y" as string]: drag?.axis === "y" ? `${Math.max(-60, Math.min(60, drag.dy * 0.3))}px` : "0px",
        ["--cx" as string]: `${size.w / 2}px`,
      }}
    >
      <div className="stage-spotlight" />
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
          <p>{t("No photos or videos in this folder yet.")}</p>
        </div>
      )}
    </div>
  );
}

type Strip = Pick<ReturnType<typeof useReel.getState>, "order" | "stacks" | "expanded"> & {
  media: ReturnType<typeof useReel.getState>["reel"]["media"];
};

/** What the strip shows. Phone: one fanned-out day (D-031) — every photo of it, bursts unfolded. */
function useStripIds(s: Strip) {
  const phone = useMedia(PHONE);
  const day = useUi((x) => (phone ? x.openDay : undefined));
  const ids = useMemo(
    () =>
      day
        ? s.order.filter((id) => dayKey(s.media[id]!.takenAt) === day)
        : visibleOrder(s.order, s.stacks, s.expanded, s.media),
    [day, s.order, s.stacks, s.expanded, s.media],
  );
  return { day, ids };
}

/**
 * In a fanned-out day: swiping past its last (or first) photo goes straight on
 * into the next (or previous) day, which fans out in turn; a burst formed by a
 * new rating is unfolded at once. Returns whether the fan-out animation runs.
 */
function useDayFollow(day: string | undefined, takenAt: string | undefined, stacks: unknown): boolean {
  const [fanning, setFanning] = useState(false);
  const now = takenAt ? dayKey(takenAt) : undefined;
  useEffect(() => {
    if (day && now && now !== day) openDay(now, useReel.getState().currentId);
  }, [day, now]);
  useEffect(() => {
    if (day) unfoldBursts();
  }, [day, stacks]);
  useEffect(() => {
    if (!day) return;
    setFanning(true);
    const timer = setTimeout(() => setFanning(false), 700);
    return () => clearTimeout(timer);
  }, [day]);
  return fanning;
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
