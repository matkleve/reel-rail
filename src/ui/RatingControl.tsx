import { Circle, Star, ThumbsDown, ThumbsUp, Trash2, type LucideIcon } from "lucide-react";

import { rateTo } from "@/store/actions";
import { RATING_LABEL, ratingClass, type Rating } from "@/types";

import { Tip } from "./kit/Tip";

const LEVELS: { r: Rating; icon: LucideIcon }[] = [
  { r: -2, icon: Trash2 },
  { r: -1, icon: ThumbsDown },
  { r: 0, icon: Circle },
  { r: 1, icon: ThumbsUp },
  { r: 2, icon: Star },
];

/** The five levels as one control — click to set, ↑/↓ to step. Colour = level. */
export function RatingControl({ value, many }: { value: Rating; many: boolean }) {
  return (
    <div className="rating-control" role="radiogroup" aria-label={many ? "Rating of selected items" : "Rating"}>
      {LEVELS.map(({ r, icon: Icon }) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          aria-label={RATING_LABEL[r]}
          className={`rate-btn has-tip ${ratingClass(r)}`}
          onClick={() => rateTo(r)}
        >
          <Icon size={16} strokeWidth={2.2} fill={value === r && r === 2 ? "currentColor" : "none"} aria-hidden="true" />
          <Tip label={RATING_LABEL[r]} kbd={r > value ? "↑" : r < value ? "↓" : undefined} side="above" />
        </button>
      ))}
    </div>
  );
}
