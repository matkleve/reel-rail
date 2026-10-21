import { useLayoutEffect, useState, type RefObject } from "react";

const MARGIN = 10;

/**
 * How far the date (top) and the dock (bottom) reach into the stage, in px.
 * Measured instead of hard-coded: both change size with the breakpoint, the
 * touch target size and the safe areas, and a guessed number goes stale the
 * first time one of them changes.
 */
export function useInsets(stage: RefObject<HTMLElement | null>, deps: unknown[]): { top: number; bottom: number } {
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });

  useLayoutEffect(() => {
    const el = stage.current;
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const meta = wrap.querySelector<HTMLElement>(".stage-meta");
    // The main dock, not the selection bar that appears above it.
    const dock = wrap.querySelector<HTMLElement>(".dock-wrap > .dock:last-child");
    const read = () => {
      const s = el.getBoundingClientRect();
      const top = meta ? Math.max(0, Math.round(meta.getBoundingClientRect().bottom - s.top + MARGIN)) : 0;
      const bottom = dock ? Math.max(0, Math.round(s.bottom - dock.getBoundingClientRect().top + MARGIN)) : 0;
      setInsets((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
    };
    read();
    const ro = new ResizeObserver(read);
    if (meta) ro.observe(meta);
    if (dock) ro.observe(dock);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return insets;
}
