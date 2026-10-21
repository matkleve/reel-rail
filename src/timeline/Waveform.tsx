import { Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";

import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { useSize } from "@/ui/useSize";

import { tagColor, tagStyle } from "@/ui/tagColor";

import { BIN_PX, drawWave, resolveColor } from "./drawWave";
import { NEUTRAL, buildWave, maxZoom, nearest, waveLayers, windowAt, type Window } from "./waveform";

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const LABEL_SPACING = 84;

/**
 * The timeline under the carousel: thick where many photos were taken, thin
 * where few were. Click or drag to jump there; wheel / pinch zooms from the
 * whole trip down to half an hour.
 */
export function Waveform() {
  const { order, media, currentId } = useReel(
    useShallow((s) => ({ order: s.order, media: s.reel.media, currentId: s.currentId })),
  );
  const presets = useReel((s) => s.reel.tagPresets);
  const zoom = useUi((s) => s.waveZoom);
  const theme = useUi((s) => s.theme);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useSize(box);

  const model = useMemo(() => buildWave(order, media), [order, media]);
  const index = currentId ? order.indexOf(currentId) : -1;
  const focus = index >= 0 ? model.pos[index]! : 0;
  // While dragging, the window holds still — otherwise it would re-centre under
  // the pointer on every jump and run away.
  const [dragWin, setDragWin] = useState<Window>();
  const win = dragWin ?? windowAt(model, zoom, focus);
  const nBins = Math.max(1, Math.floor(size.w / BIN_PX));
  const waves = useMemo(() => waveLayers(model, media, win, nBins), [model, media, win.start, win.span, nBins]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = canvas.current;
    if (!el || !size.w) return;
    const colorOf = (tag: string) =>
      tag === NEUTRAL ? resolveColor(el, "var(--wave-neutral)") : resolveColor(el, tagColor(tag, presets));
    drawWave(el, waves, colorOf, size.w, size.h);
  }, [waves, size, theme, presets]);

  useWheelZoom(box, maxZoom(model));

  const toX = (p: number) => ((p - win.start) / win.span) * size.w;
  const jump = (e: PointerEvent, w: Window) => {
    const rect = box.current!.getBoundingClientRect();
    const p = w.start + ((e.clientX - rect.left) / rect.width) * w.span;
    const id = model.ids[nearest(model.pos, p)];
    if (id) useReel.getState().setCurrent(id);
  };

  let lastLabel = -Infinity;
  const labels = model.days.flatMap((d) => {
    const x = toX(d.pos);
    if (x < -40 || x > size.w || x - lastLabel < LABEL_SPACING) return [];
    lastLabel = x;
    return [{ ...d, x }];
  });

  return (
    <div
      className="wave"
      ref={box}
      role="slider"
      aria-label="Timeline — click or drag to jump"
      aria-valuemin={1}
      aria-valuemax={order.length}
      aria-valuenow={index + 1}
      tabIndex={-1}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragWin(win);
        jump(e, win);
      }}
      onPointerMove={(e) => dragWin && jump(e, dragWin)}
      onPointerUp={() => setDragWin(undefined)}
      onPointerCancel={() => setDragWin(undefined)}
    >
      <canvas ref={canvas} className="wave-canvas" style={{ width: size.w, height: size.h }} />
      {model.days.map((d) => {
        const x = toX(d.pos);
        return x >= 0 && x <= size.w ? <span key={d.key} className="wave-day" style={{ left: x }} /> : null;
      })}
      {labels.map((d) => (
        <span key={d.key} className="wave-label" style={{ left: d.x }}>
          {DAY.format(d.date)}
        </span>
      ))}
      {index >= 0 && <span className="wave-cursor" style={{ left: toX(focus) }} />}
      {zoom > 1.01 && <span className="wave-zoom muted">{formatSpan(win.span)}</span>}
      <Legend tags={waves.layers.map((l) => l.tag).filter((t) => t !== NEUTRAL)} presets={presets} />
    </div>
  );
}

/** Which colour is which tag, and which way is up. */
function Legend({ tags, presets }: { tags: string[]; presets: string[] }) {
  return (
    <>
      <span className="wave-axis up">
        <Star size={10} fill="currentColor" strokeWidth={0} /> Better
      </span>
      <span className="wave-axis down">
        <Trash2 size={10} /> Weaker
      </span>
      <span className="wave-legend">
        {tags.map((t) => (
          <span key={t}>
            <i className="tag-dot" style={tagStyle(t, presets)} />
            {t}
          </span>
        ))}
      </span>
    </>
  );
}

function formatSpan(hours: number): string {
  return hours >= 20 ? `${Math.round(hours / 14)} days shown` : `${Math.round(hours * 10) / 10} h shown`;
}

/** Wheel / pinch over the waveform zooms it. Non-passive so a pinch does not zoom the page. */
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
      ui.set({ waveZoom: Math.max(1, Math.min(maxRef.current, ui.waveZoom * Math.exp(-e.deltaY * k))) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}
