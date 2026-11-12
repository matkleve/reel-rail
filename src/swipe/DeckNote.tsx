import { Heart, Star, Trash2, X, type LucideIcon } from "lucide-react";

import { t } from "@/i18n";
import { graceMs } from "@/store/discards";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import type { Verdict } from "./deckGesture";

const ICON: Record<Verdict, LucideIcon> = { good: Heart, bad: X, top: Star, delete: Trash2 };

/**
 * What just happened, under the buttons where the hint line sits — not on the
 * photo: the next photo is what you look at now. The verdict's own icon in
 * its colour (the buttons' language), and "Undo" as a quiet text button
 * (the round ↺ does the same). It was a glass pill over the photo with a dot
 * that matched nothing (user, 2026-11-12).
 */
export function DeckNote({ verdict, onUndo }: { verdict: Verdict; onUndo(): void }) {
  const inPlace = useReel((x) => x.reel.workflow === "edit") && useUi.getState().sourceKind === "folder";
  const grace = Math.round(graceMs() / 1000);
  const text =
    verdict === "delete"
      ? inPlace
        ? t("Leaves the folder in {n} s", { n: grace })
        : t("Deleted — leaves in {n} s", { n: grace })
      : verdict === "bad"
        ? t("Bad — kept as a filler")
        : verdict === "top"
          ? t("Top")
          : t("Good");
  const Icon = ICON[verdict];
  return (
    <div className={`deck-note is-${verdict}`} role="status">
      <span className="deck-note-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.6} fill={verdict === "good" || verdict === "top" ? "currentColor" : "none"} />
      </span>
      <span className="deck-note-text">{text}</span>
      <button type="button" className="deck-note-undo" onClick={onUndo}>
        {t("Undo")}
      </button>
    </div>
  );
}
