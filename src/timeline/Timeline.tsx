import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from "react";

import { passes } from "@/store/filters";
import { useReel } from "@/store/useReel";

import { firstVisible, layoutTimeline } from "./layout";
import { DayMarker, GapMarker } from "./Markers";
import { TimelineItem } from "./TimelineItem";
import { useViewport } from "./useViewport";

/** Render this much beyond each viewport edge so fast scrolling never shows holes. */
const OVERSCAN = 600;

/**
 * The rail. Only the slots inside the viewport (+ overscan) are mounted, so
 * 2,000+ media cost the same as 50.
 */
export function Timeline() {
  const order = useReel((s) => s.order);
  const media = useReel((s) => s.reel.media);
  const currentId = useReel((s) => s.currentId);
  const selection = useReel((s) => s.selection);
  const filters = useReel((s) => s.filters);
  const setCurrent = useReel((s) => s.setCurrent);

  const scroller = useRef<HTMLDivElement>(null);
  const vp = useViewport(scroller);
  const layout = useMemo(() => layoutTimeline(order, media), [order, media]);

  // Half a viewport of padding on both ends lets the first and last item centre.
  const pad = Math.round(vp.width / 2);
  const lineY = Math.round(vp.height * 0.62);

  const current = currentId ? layout.byId.get(currentId) : undefined;
  const cx = current?.x;
  const cw = current?.w;
  useEffect(() => {
    if (cx === undefined || cw === undefined || !scroller.current) return;
    scroller.current.scrollTo({ left: cx + cw / 2, behavior: "smooth" });
  }, [currentId, cx, cw]);

  // A mouse wheel scrolls the rail sideways — there is nothing to scroll vertically.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPick = useCallback(
    (id: string, e: MouseEvent) => {
      setCurrent(id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "extend" : "replace");
    },
    [setCurrent],
  );

  const from = vp.scrollLeft - pad - OVERSCAN;
  const to = vp.scrollLeft - pad + vp.width + OVERSCAN;
  const visible = [];
  for (let i = firstVisible(layout.slots, from); i < layout.slots.length; i++) {
    const s = layout.slots[i]!;
    if (s.x > to) break;
    visible.push(s);
  }

  return (
    <div className="timeline" ref={scroller} aria-label="Timeline">
      <div className="tl-rail" style={{ width: layout.width + pad * 2, ["--line-y" as string]: `${lineY}px` }}>
        <div className="tl-line" style={{ top: lineY }} />
        {vp.height > 0 &&
          visible.map((s) => {
            if (s.kind === "day") return <DayMarker key={s.key} slot={s} left={pad + s.x} />;
            if (s.kind === "gap") return <GapMarker key={s.key} slot={s} left={pad + s.x} />;
            const m = media[s.id]!;
            return (
              <TimelineItem
                key={s.id}
                media={m}
                slot={s}
                left={pad + s.x}
                lineY={lineY}
                current={s.id === currentId}
                selected={selection.has(s.id)}
                dimmed={!passes(m, filters)}
                onPick={onPick}
              />
            );
          })}
      </div>
    </div>
  );
}
