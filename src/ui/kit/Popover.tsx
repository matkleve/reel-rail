import { useId, useRef, type ReactNode } from "react";

/**
 * A menu/panel on the native popover API: top layer, light dismiss and Esc
 * for free. Positioned against its trigger when it opens (CSS anchor
 * positioning would do this, but not in every browser we will meet).
 */
export function Popover({
  trigger,
  children,
  side = "below",
  align = "center",
  className,
}: {
  trigger: (props: { popoverTarget: string }) => ReactNode;
  children: ReactNode;
  side?: "below" | "above";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const panel = useRef<HTMLDivElement>(null);

  const place = (e: React.ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== "open") return;
    const el = panel.current;
    const anchor = document.querySelector(`[popovertarget="${id}"]`);
    if (!el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = align === "start" ? a.left : align === "end" ? a.right - w : a.left + a.width / 2 - w / 2;
    el.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, x))}px`;
    el.style.top = `${side === "below" ? a.bottom + 8 : a.top - h - 8}px`;
    el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  };

  return (
    <>
      {trigger({ popoverTarget: id })}
      <div id={id} ref={panel} popover="auto" className={`popover ${className ?? ""}`} onToggle={place}>
        {children}
      </div>
    </>
  );
}
