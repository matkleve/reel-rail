import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { passes } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { GROUP_BY_KEY } from "./groupPref";
import { groupMedia, type Group, type GroupBy } from "./groups";

/**
 * The phone timeline's stacks (D-031): how they are grouped (useUi.groupBy,
 * remembered), which one is fanned out (useUi.openGroup), and the moves
 * between them.
 */

/** The groups of what passes the filters, in order, and which group each item is in. */
export function useGroups(): { groups: Group[]; groupOf: Map<string, string> } {
  const by = useUi((x) => x.groupBy);
  const s = useReel(useShallow((x) => ({ order: x.order, media: x.reel.media, filters: x.filters })));
  return useMemo(() => {
    const ids = s.order.filter((id) => passes(s.media[id]!, s.filters));
    const groups = groupMedia(by, ids, s.media);
    const groupOf = new Map<string, string>();
    for (const g of groups) for (const id of g.ids) groupOf.set(id, g.key);
    return { groups, groupOf };
  }, [by, s.order, s.media, s.filters]);
}

/** The bursts that were open before a group was fanned out — given back when it closes. */
let before: ReadonlySet<string> | undefined;

/**
 * Fans a group out, at `at` or its first photo. ← / → then walk the groups one
 * after another (`nav`), every photo on its own — no burst folded.
 */
export function openGroup(groups: Group[], key: string, at?: string): void {
  const g = groups.find((x) => x.key === key);
  if (!g) return;
  const s = useReel.getState();
  if (!useUi.getState().openGroup) before = s.expanded;
  useReel.setState({ nav: groups.flatMap((x) => x.ids), expanded: new Set(Object.keys(s.stacks.members)) });
  const target = at && g.ids.includes(at) ? at : g.ids[0];
  if (target && target !== s.currentId) s.setCurrent(target);
  useUi.getState().set({ openGroup: key });
}

/** Folds the group back into its stack. */
export function closeGroup(): void {
  useReel.setState({ nav: undefined, expanded: before ?? new Set() });
  before = undefined;
  useUi.getState().set({ openGroup: undefined });
}

/** Another way of stacking: remembered, and whatever was open is folded. */
export function setGroupBy(by: GroupBy): void {
  if (useUi.getState().openGroup) closeGroup();
  useUi.getState().set({ groupBy: by });
  try {
    localStorage.setItem(GROUP_BY_KEY, by);
  } catch {
    // Private mode: for this session only.
  }
}
