import type { LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Tip } from "./Tip";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  /** Icon-only: `label` becomes the accessible name and the tooltip. */
  label?: string;
  /** Shortcut shown in the tooltip. */
  kbd?: string;
  tipSide?: "below" | "above";
  /** Small number after the label (e.g. "Series 3"). */
  count?: number;
  children?: ReactNode;
};

const ICON = { sm: 14, md: 16, lg: 18 } as const;

/**
 * The only button. Text buttons get `children`; icon-only buttons get `icon`
 * + `label`, which always yields an accessible name and a tooltip.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "ghost", size = "md", icon: Icon, label, kbd, tipSide = "below", count, children, className, ...rest },
  ref,
) {
  const iconOnly = !children && !!Icon;
  const cls = ["btn", `btn-${variant}`, size !== "md" && `btn-${size}`, iconOnly && "btn-icon", iconOnly && "has-tip", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type="button" className={cls} aria-label={iconOnly ? label : undefined} {...rest}>
      {Icon && <Icon size={ICON[size]} strokeWidth={2} aria-hidden="true" />}
      {children}
      {count !== undefined && count > 0 && <span className="btn-count">{count}</span>}
      {iconOnly && label && <Tip label={label} kbd={kbd} side={tipSide} />}
    </button>
  );
});
