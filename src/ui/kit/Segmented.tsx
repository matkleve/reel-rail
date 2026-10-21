import type { LucideIcon } from "lucide-react";

type Option<T extends string> = { value: T; label: string; icon?: LucideIcon };

/** A single-choice control for 2–5 options that are all worth seeing at once. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <o.icon size={14} aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
