import { useEffect, useRef, type ReactNode } from "react";

/**
 * A modal on the native <dialog> (pattern from grundriss). `showModal()` gives
 * focus trap, Escape, top layer and `inert` behind it for free — each of those
 * is a classic way to get a hand-rolled modal wrong.
 */
type Props = {
  open: boolean;
  onClose(): void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function Dialog({ open, onClose, title, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={wide ? "dialog is-wide" : "dialog"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
    >
      {open && (
        <>
          <h2 id="dialog-title">{title}</h2>
          {children && <div className="dialog-body">{children}</div>}
          {footer && <div className="dialog-footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
