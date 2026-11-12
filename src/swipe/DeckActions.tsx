import { Heart, RotateCcw, Star, Trash2, X } from "lucide-react";

import { t } from "@/i18n";
import type { Media } from "@/types";
import { Button } from "@/ui/kit/Button";

import type { Verdict } from "./deckGesture";

type Props = { media?: Media; onThrow(v: Verdict): void; onUndo(): void };

/**
 * The round buttons under the deck — the four throws for one thumb, plus ↺.
 * The two big ones are the two you use most (bad, good); top and delete are
 * smaller, the deliberate ones. Order follows the hand: undo and delete at
 * the edge, the everyday pair in the middle.
 */
export function DeckActions({ media, onThrow, onUndo }: Props) {
  const off = !media;
  return (
    <div className="deck-actions" role="toolbar" aria-label={t("Decide")}>
      <Button className="deck-btn is-undo" icon={RotateCcw} label={t("Undo")} kbd="Z" tipSide="above" onClick={onUndo} />
      <Button className="deck-btn is-delete" icon={Trash2} label={t("Delete")} kbd="↓" tipSide="above" disabled={off} onClick={() => onThrow("delete")} />
      <Button className="deck-btn is-big is-bad" icon={X} label={t("Bad")} kbd="←" tipSide="above" disabled={off} onClick={() => onThrow("bad")} />
      <Button className="deck-btn is-top" icon={Star} label={t("Top")} kbd="↑" tipSide="above" disabled={off} onClick={() => onThrow("top")} />
      <Button className="deck-btn is-big is-good" icon={Heart} label={t("Good")} kbd="→" tipSide="above" disabled={off} onClick={() => onThrow("good")} />
    </div>
  );
}
