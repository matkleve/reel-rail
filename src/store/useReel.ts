import { create } from "zustand";

import { emptyReel, type Media, type Rating, type ReelFile, type Series } from "@/types";

import { DEFAULT_FILTERS, passes, type Filters } from "./filters";
import { chronological, rangeBetween } from "./order";
import { applyStackIds, computeStacks, isShown, visibleOrder, type Stacks } from "./stacks";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type RatingChange = { id: string; rating: Rating };

export type ReelState = {
  reel: ReelFile;
  /** All present media, chronological. */
  order: string[];
  stacks: Stacks;
  expanded: ReadonlySet<string>;
  currentId?: string;
  selection: ReadonlySet<string>;
  anchorId?: string;
  filters: Filters;
  undoStack: RatingChange[][];
  saveState: SaveState;

  load(reel: ReelFile): void;
  /** Recomputes order and stacks after media appeared or vanished. */
  refresh(reel: ReelFile): void;
  setCurrent(id: string, mode?: "replace" | "toggle" | "extend"): void;
  step(dir: 1 | -1, extend?: boolean): void;
  clearSelection(): void;
  rate(delta: 1 | -1): void;
  /** The one way ratings change — every change is one undo step. */
  setRatings(changes: RatingChange[]): void;
  undo(): void;
  patch(ids: string[], fn: (m: Media) => Media): void;
  setFilters(patch: Partial<Filters>): void;
  addSeries(series: Series): void;
  /** Records an export of `ids` (default: the whole series). Re-exporting replaces the record. */
  markExported(seriesId: string, exportedPath: string, ids?: string[]): void;
  setSaveState(s: SaveState): void;
};

const clampRating = (r: number): Rating => Math.max(-2, Math.min(2, r)) as Rating;

/** Ids an action applies to: the selection if there is one, else the current item. */
export function targetIds(s: Pick<ReelState, "selection" | "currentId">): string[] {
  if (s.selection.size) return [...s.selection];
  return s.currentId ? [s.currentId] : [];
}

export function patchMedia(reel: ReelFile, ids: string[], fn: (m: Media) => Media): ReelFile {
  const media = { ...reel.media };
  for (const id of ids) if (media[id]) media[id] = fn(media[id]);
  return { ...reel, media };
}

function derive(reel: ReelFile) {
  const order = chronological(reel.media);
  const stacks = computeStacks(order, reel.media);
  return { order, stacks, reel: { ...reel, media: applyStackIds(reel.media, stacks) } };
}

// A zustand store is one object literal of actions; splitting it to satisfy a
// per-function line limit would scatter one state machine across files.
// eslint-disable-next-line max-lines-per-function
export const useReel = create<ReelState>()((set, get) => ({
  reel: emptyReel(),
  order: [],
  stacks: { stackOf: {}, members: {} },
  expanded: new Set(),
  selection: new Set(),
  filters: DEFAULT_FILTERS,
  undoStack: [],
  saveState: "idle",

  load(reel) {
    const d = derive(reel);
    const first = visibleOrder(d.order, d.stacks, new Set(), d.reel.media)[0];
    set({ ...d, expanded: new Set(), currentId: first, selection: new Set(), anchorId: undefined, undoStack: [] });
  },

  refresh(reel) {
    const d = derive(reel);
    const { currentId } = get();
    const keep = currentId && d.reel.media[currentId] && !d.reel.media[currentId]!.missing;
    const selection = new Set([...get().selection].filter((id) => d.order.includes(id)));
    set({ ...d, selection, currentId: keep ? currentId : d.order[0] });
  },

  setCurrent(id, mode = "replace") {
    const s = get();
    if (mode === "toggle") {
      const selection = new Set(s.selection);
      // The first ctrl-click also keeps the item you were on — that is what
      // "add to selection" means when nothing was selected yet.
      if (!selection.size && s.currentId && s.currentId !== id) selection.add(s.currentId);
      if (selection.has(id)) selection.delete(id);
      else selection.add(id);
      set({ currentId: id, selection, anchorId: id });
    } else if (mode === "extend") {
      const anchor = s.anchorId ?? s.currentId ?? id;
      // Range over what is on the rail: a collapsed burst contributes its cover only.
      const shown = visibleOrder(s.order, s.stacks, s.expanded, s.reel.media);
      set({ currentId: id, anchorId: anchor, selection: new Set(rangeBetween(shown, anchor, id)) });
    } else {
      set({ currentId: id, selection: new Set(), anchorId: undefined });
    }
  },

  step(dir, extend = false) {
    const { order, currentId, reel, filters, stacks, expanded } = get();
    let i = currentId ? order.indexOf(currentId) : -1;
    for (i += dir; i >= 0 && i < order.length; i += dir) {
      const id = order[i]!;
      if (passes(reel.media[id]!, filters) && isShown(id, stacks, expanded, reel.media)) break;
    }
    const id = order[i];
    if (id) get().setCurrent(id, extend ? "extend" : "replace");
  },

  clearSelection() {
    set({ selection: new Set(), anchorId: undefined });
  },

  rate(delta) {
    const s = get();
    const changes = targetIds(s).flatMap((id) => {
      const m = s.reel.media[id];
      return m ? [{ id, rating: clampRating(m.rating + delta) }] : [];
    });
    s.setRatings(changes);
  },

  setRatings(changes) {
    const { reel, undoStack } = get();
    const real = changes.filter((c) => reel.media[c.id] && reel.media[c.id]!.rating !== c.rating);
    if (!real.length) return;
    const before = real.map((c) => ({ id: c.id, rating: reel.media[c.id]!.rating }));
    const to = new Map(real.map((c) => [c.id, c.rating]));
    set({
      reel: patchMedia(reel, [...to.keys()], (m) => ({ ...m, rating: to.get(m.id)! })),
      undoStack: [...undoStack.slice(-199), before],
    });
  },

  undo() {
    const { undoStack, reel } = get();
    const last = undoStack.at(-1);
    if (!last) return;
    const prev = new Map(last.map((u) => [u.id, u.rating]));
    set({
      reel: patchMedia(reel, [...prev.keys()], (m) => ({ ...m, rating: prev.get(m.id)! })),
      undoStack: undoStack.slice(0, -1),
      currentId: last[0]?.id ?? get().currentId,
    });
  },

  patch(ids, fn) {
    set({ reel: patchMedia(get().reel, ids, fn) });
  },

  setFilters(patch) {
    set({ filters: { ...get().filters, ...patch } });
  },

  addSeries(series) {
    const reel = get().reel;
    set({ reel: { ...reel, series: [...reel.series, series] } });
  },

  markExported(seriesId, exportedPath, ids) {
    const reel = get().reel;
    const series = reel.series.find((x) => x.id === seriesId);
    if (!series) return;
    const at = new Date().toISOString();
    const next = patchMedia(reel, ids ?? series.mediaIds, (m) => ({
      ...m,
      exportedTo: [...m.exportedTo.filter((e) => e.series !== seriesId), { series: seriesId, at }],
    }));
    next.series = reel.series.map((x) => (x.id === seriesId ? { ...x, exportedPath } : x));
    set({ reel: next });
  },

  setSaveState(saveState) {
    set({ saveState });
  },
}));
