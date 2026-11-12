import { passes } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { dayKey } from "./days";

/** The bursts that were open before a day was fanned out — given back when it closes. */
let before: ReadonlySet<string> | undefined;

/** Every burst open: inside a day each photo is its own card, gone through one by one. */
export function unfoldBursts(): void {
  const s = useReel.getState();
  const all = Object.keys(s.stacks.members);
  if (all.every((sid) => s.expanded.has(sid))) return;
  useReel.setState({ expanded: new Set(all) });
}

/** Fans a day out, at `at` or the day's first photo. */
export function openDay(key: string, at?: string): void {
  const s = useReel.getState();
  if (!useUi.getState().openDay) before = s.expanded;
  unfoldBursts();
  const first = at ?? s.order.find((id) => dayKey(s.reel.media[id]!.takenAt) === key && passes(s.reel.media[id]!, s.filters));
  if (first && first !== s.currentId) s.setCurrent(first);
  useUi.getState().set({ openDay: key });
}

/** Folds the day back into its stack. */
export function closeDay(): void {
  useReel.setState({ expanded: before ?? new Set() });
  before = undefined;
  useUi.getState().set({ openDay: undefined });
}
