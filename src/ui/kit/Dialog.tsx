import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./Button";

/**
 * Modal on the native <dialog> (pattern from grundriss): focus trap, Esc,
 * top layer and an inert page behind it, for free.
 *
 * Layout is fixed — head (title, optional subtitle, close), scrolling body,
 * footer — so every dialog in the app looks and behaves the same.
 */
type Props = {
  open: boolean;
  onClose(): void;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function Dialog({ open, onClose, title, subtitle, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first focusable — the close button — which
      // lights up its ring and tooltip on every open. Prefer the field the
      // dialog is about; otherwise rest on the dialog itself.
      const target = d.querySelector<HTMLElement>("[data-autofocus]");
      if (target) target.focus();
      else d.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={wide ? "dialog is-wide" : "dialog"}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      tabIndex={-1}
    >
      {open && (
        <>
          <div className="dialog-head">
            <div>
              <h2 id="dialog-title">{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <Button icon={X} label="Close" kbd="Esc" size="sm" onClick={onClose} />
          </div>
          {children && <div className="dialog-body">{children}</div>}
          {footer && <div className="dialog-footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
