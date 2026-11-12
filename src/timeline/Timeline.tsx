import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";

import { locale, t } from "@/i18n";
import type { RatingFilter } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { useSize } from "@/ui/useSize";

import { binCount, drawBars } from "./drawBars";
import { barBins, buildAxis, maxZoom, windowAt, type Level } from "./timeModel";
import { useTimelinePointers } from "./useTimelinePointers";

const DAY = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
const LABEL_SPACING = 84;
/** Room above the bars: the day labels, and on a tall timeline a second row for the legend. */
const TOP_ROOM = { short: 22, tall: 42 };
const TALL = 90;

/** What the rating filter hides — drawn faint, so the gaps it leaves stay visible. */
const FAINT: Record<RatingFilter, ReadonlySet<Level>> = {
  all: new Set(),
  good: new Set(["bad", "unrated"]),
  favorite: new Set(["good", "bad", "unrated"]),
};

const LEGEND: { level: Level; label: string }[] = [
  { level: "top", label: t("Top") },
  { level: "good", label: t("Good") },
  { level: "bad", label: t("Bad") },
  { level: "unrated", label: t("Not rated") },
];

/**
 * The timeline under the photos: one bar per stretch of time, stacked by
 * rating — top shots gold at the base, then good, bad (fillers) and not yet
 * rated. Click or drag to jump there; wheel / pinch zooms from the whole trip
 * down to half an hour.
 */
export function Timeline() {
  const { order, media, currentId, rating } = useReel(
    useShallow((s) => ({ order: s.order, media: s.reel.media, currentId: s.currentId, rating: s.filters.rating })),
  );
  const zoom = useUi((s) => s.timeZoom);
  const theme = useUi((s) => s.theme);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useSize(box);

  const axis = useMemo(() => buildAxis(order, media), [order, media]);
  const index = currentId ? order.indexOf(currentId) : -1;
  const focus = index >= 0 ? axis.pos[index]! : 0;
  const maxZ = maxZoom(axis);
  // The pointer hook owns the drag window; it needs the current one to start from.
  const baseWin = windowAt(axis, zoom, focus);
  const { dragWin, handlers } = useTimelinePointers(box, axis, baseWin, maxZ);
  const win = dragWin ?? baseWin;
  const nBins = binCount(size.w);
  const bars = useMemo(() => barBins(axis, media, win, nBins), [axis, media, win.start, win.span, nBins]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = canvas.current;
    if (!el || !size.w) return;
    drawBars(el, bars, FAINT[rating], { ...size, top: size.h > TALL ? TOP_ROOM.tall : TOP_ROOM.short });
  }, [bars, size, theme, rating]);

  useWheelZoom(box, maxZ);

  const toX = (p: number) => ((p - win.start) / win.span) * size.w;

  let lastLabel = -Infinity;
  const labels = axis.days.flatMap((d) => {
    const x = toX(d.pos);
    if (x < -40 || x > size.w || x - lastLabel < LABEL_SPACING) return [];
    lastLabel = x;
    return [{ ...d, x, text: DAY.format(d.date) }];
  });

  return (
    <div
      className="timeline"
      ref={box}
      role="slider"
      aria-label={t("Timeline — tap or drag to jump, pinch or scroll to zoom")}
      aria-valuemin={1}
      aria-valuemax={order.length}
      aria-valuenow={index + 1}
      tabIndex={-1}
      {...handlers}
    >
      <canvas ref={canvas} className="timeline-canvas" style={{ width: size.w, height: size.h }} />
      {axis.days.map((d) => {
        const x = toX(d.pos);
        return x >= 0 && x <= size.w ? <span key={d.key} className="timeline-day" style={{ left: x }} /> : null;
      })}
      {labels.map((d) => (
        <span key={d.key} className="timeline-label" style={{ left: Math.min(d.x, size.w - labelWidth(d.text)) }}>
          {d.text}
        </span>
      ))}
      {index >= 0 && <span className="timeline-cursor" style={{ left: toX(focus) }} />}
      {zoom > 1.01 && <span className="timeline-zoom">{formatSpan(win.span)}</span>}
      <span className="timeline-legend" aria-hidden="true">
        {LEGEND.map((l) => (
          <span key={l.level}>
            <i className={`timeline-swatch is-${l.level}`} />
            {l.label}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * Roughly how wide a day label is (12 px type, padding, margin): a label near
 * the right end is pulled in so it is not cut off — German dates ("Do., 15. Okt.")
 * are longer than English ones.
 */
function labelWidth(text: string): number {
  return text.length * 7 + 20;
}

function formatSpan(hours: number): string {
  return hours >= 20
    ? t("{n} days shown", { n: Math.round(hours / 14) })
    : t("{n} h shown", { n: (Math.round(hours * 10) / 10).toLocaleString(locale) });
}

/** Wheel / pinch over the timeline zooms it. Non-passive so a pinch does not zoom the page. */
function useWheelZoom(ref: RefObject<HTMLElement | null>, max: number) {
  const maxRef = useRef(max);
  maxRef.current = max;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ui = useUi.getState();
      const k = e.ctrlKey ? 0.01 : 0.002;
      ui.set({ timeZoom: Math.max(1, Math.min(maxRef.current, ui.timeZoom * Math.exp(-e.deltaY * k))) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}
