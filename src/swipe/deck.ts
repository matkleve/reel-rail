import { t } from "@/i18n";
import { passes } from "@/store/filters";
import { useReel, type ReelState } from "@/store/useReel";
import { showToast } from "@/store/useUi";
import type { Rating } from "@/types";

import { VERDICT_RATING, type Verdict } from "./deckGesture";

/**
 * The deck's moves on top of the store. The deck has its own undo history
 * because a swipe that does not change the rating (keeping a "Good" as
 * "Good") pushes nothing onto the store's undo stack — the deck's ↺ would
 * then take back an older, unrelated decision.
 */

type Deck = Pick<ReelState, "order" | "stacks" | "expanded" | "currentId" | "filters" | "reel">;

/**
 * What the deck deals: every item passing the filters, in time order. Bursts
 * are not folded here — the deck is one decision per photo, and a stack with
 * a "2" on it only raised the question where the other one went (user,
 * 2026-11-12). The timeline still folds them.
 */
export function deckOrder(s: Deck): string[] {
  return s.order.filter((id) => passes(s.reel.media[id]!, s.filters));
}

/** The top card: the current item. */
export function topOf(s: Deck): string | undefined {
  return s.currentId;
}

const history: { id: string; before: Rating }[] = [];

/** Rates the top card and deals the next one. False when there was no next one. */
export function decide(verdict: Verdict): boolean {
  const s = useReel.getState();
  const id = topOf(s);
  const m = id ? s.reel.media[id] : undefined;
  if (!id || !m) return false;
  // The next card is decided before rating: the new rating may take this one out of the filter.
  const order = deckOrder(s);
  const next = order[order.indexOf(id) + 1];
  history.push({ id, before: m.rating });
  if (history.length > 200) history.shift();
  s.setRatings([{ id, rating: VERDICT_RATING[verdict] }]);
  if (next) useReel.getState().setCurrent(next);
  return !!next;
}

/** ↺ — the last decision comes back to the top of the deck with its old rating. */
export function undoDecision(): boolean {
  const last = history.pop();
  if (!last) return false;
  const s = useReel.getState();
  const m = s.reel.media[last.id];
  if (!m) return false;
  if (m.binned) {
    showToast(t("Already in Recently deleted — bring it back from there"));
    return false;
  }
  s.setRatings([{ id: last.id, rating: last.before }]);
  s.setCurrent(last.id);
  return true;
}

export function canUndoDecision(): boolean {
  return history.length > 0;
}

/** After the last card: deal again from the first. */
export function restartDeck(): void {
  const s = useReel.getState();
  const first = deckOrder(s)[0];
  if (first) s.setCurrent(first);
}
