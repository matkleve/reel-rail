import { Kbd } from "./Kbd";

/**
 * Tooltip for icon-only controls. Pure CSS (shown on hover and on keyboard
 * focus of the parent `.has-tip`), so it costs nothing per button.
 */
export function Tip({ label, kbd, side = "below" }: { label: string; kbd?: string; side?: "below" | "above" }) {
  return (
    <span className={`tip ${side}`} aria-hidden="true">
      {label}
      {kbd && <Kbd>{kbd}</Kbd>}
    </span>
  );
}
