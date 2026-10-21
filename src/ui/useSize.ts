import { useEffect, useState, type RefObject } from "react";

/** Content size of an element, updated on resize (rAF-throttled). */
export function useSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    };
    const ro = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(read);
    });
    ro.observe(el);
    read();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref]);

  return size;
}
