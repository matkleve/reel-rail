import { Heart, Star, Trash2, X, type LucideIcon } from "lucide-react";

import { t } from "@/i18n";
import { rateTo } from "@/store/actions";
import { RATING_LABEL, ratingClass, type Rating } from "@/types";

import { Tip } from "./kit/Tip";

/**
 * The same four verdicts, icons and order as the buttons under the swipe
 * deck (DeckActions) — one language in both views. The user asked for this:
 * the timeline used to show five levels with thumbs and a circle.
 */
const VERDICTS: { r: Rating; icon: LucideIcon }[] = [
  { r: -2, icon: Trash2 },
  { r: -1, icon: X },
  { r: 2, icon: Star },
  { r: 1, icon: Heart },
];

/**
 * Four toggles: tap to set, tap the lit one again to take the rating back
 * (not rated). "Not rated" has no button of its own — it is what you start
 * with, not a verdict. ↑/↓ still step through the levels from the keyboard.
 */
export function RatingControl({ value, many }: { value: Rating; many: boolean }) {
  return (
    <div className="rating-control" role="group" aria-label={many ? t("Rating of selected items") : t("Rating")}>
      {VERDICTS.map(({ r, icon: Icon }) => {
        const on = value === r;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={on}
            aria-label={RATING_LABEL[r]}
            className={`rate-btn has-tip ${ratingClass(r)}`}
            onClick={() => rateTo(on ? 0 : r)}
          >
            <Icon size={18} strokeWidth={2.2} fill={on && r > 0 ? "currentColor" : "none"} aria-hidden="true" />
            <Tip label={on ? t("Not rated") : RATING_LABEL[r]} side="above" />
          </button>
        );
      })}
    </div>
  );
}
