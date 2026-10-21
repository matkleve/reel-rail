import { useEffect, useState, type RefObject } from "react";

/** Width, height and scroll offset of a horizontal scroller, rAF-throttled. */
export function useViewport(ref: RefObject<HTMLElement | null>) {
  const [vp, setVp] = useState({ width: 0, height: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      setVp({ width: el.clientWidth, height: el.clientHeight, scrollLeft: el.scrollLeft });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    el.addEventListener("scroll", schedule, { passive: true });
    read();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref]);

  return vp;
}
