import { create } from "zustand";

import { emptyReel, type Media, type Rating, type ReelFile, type Series } from "@/types";

import { DEFAULT_FILTERS, passes, type Filters } from "./filters";
import { chronological, rangeBetween } from "./order";

export type SaveState = "idle" | "saving" | "saved" | "error";
type UndoStep = { id: string; rating: Rating }[];

export type ReelState = {
  reel: ReelFile;
  order: string[];
  currentId?: string;
  selection: ReadonlySet<string>;
  anchorId?: string;
  filters: Filters;
  undoStack: UndoStep[];
  saveState: SaveState;

  load(reel: ReelFile): void;
  setCurrent(id: string, mode?: "replace" | "toggle" | "extend"): void;
  step(dir: 1 | -1, extend?: boolean): void;
  clearSelection(): void;
  rate(delta: 1 | -1): void;
  undo(): void;
  setPlace(ids: string[], place: string): void;
  setFilters(patch: Partial<Filters>): void;
  addSeries(series: Series): void;
  markExported(seriesId: string, exportedPath: string): void;
  setSaveState(s: SaveState): void;
};

const clampRating = (r: number): Rating => Math.max(-1, Math.min(2, r)) as Rating;

/** Ids an action applies to: the selection if there is one, else the current item. */
export function targetIds(s: Pick<ReelState, "selection" | "currentId">): string[] {
  if (s.selection.size) return [...s.selection];
  return s.currentId ? [s.currentId] : [];
}

function patchMedia(reel: ReelFile, ids: string[], fn: (m: Media) => Media): ReelFile {
  const media = { ...reel.media };
  for (const id of ids) if (media[id]) media[id] = fn(media[id]);
  return { ...reel, media };
}

// A zustand store is one object literal of actions; splitting it to satisfy a
// per-function line limit would scatter one state machine across files.
// eslint-disable-next-line max-lines-per-function
export const useReel = create<ReelState>()((set, get) => ({
  reel: emptyReel(),
  order: [],
  selection: new Set(),
  filters: DEFAULT_FILTERS,
  undoStack: [],
  saveState: "idle",

  load(reel) {
    const order = chronological(reel.media);
    set({ reel, order, currentId: order[0], selection: new Set(), anchorId: undefined, undoStack: [] });
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
      set({ currentId: id, anchorId: anchor, selection: new Set(rangeBetween(s.order, anchor, id)) });
    } else {
      set({ currentId: id, selection: new Set(), anchorId: undefined });
    }
  },

  step(dir, extend = false) {
    const { order, currentId, reel, filters } = get();
    let i = currentId ? order.indexOf(currentId) : -1;
    for (i += dir; i >= 0 && i < order.length; i += dir) {
      const m = reel.media[order[i]!];
      if (m && passes(m, filters)) break;
    }
    const id = order[i];
    if (id) get().setCurrent(id, extend ? "extend" : "replace");
  },

  clearSelection() {
    set({ selection: new Set(), anchorId: undefined });
  },

  rate(delta) {
    const s = get();
    const ids = targetIds(s).filter((id) => s.reel.media[id]);
    if (!ids.length) return;
    const before: UndoStep = ids.map((id) => ({ id, rating: s.reel.media[id]!.rating }));
    if (before.every((b) => clampRating(b.rating + delta) === b.rating)) return;
    set({
      reel: patchMedia(s.reel, ids, (m) => ({ ...m, rating: clampRating(m.rating + delta) })),
      undoStack: [...s.undoStack.slice(-199), before],
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

  setPlace(ids, place) {
    const value = place.trim();
    set({
      reel: patchMedia(get().reel, ids, (m) => {
        const next = { ...m };
        if (value) next.place = value;
        else delete next.place;
        return next;
      }),
    });
  },

  setFilters(patch) {
    set({ filters: { ...get().filters, ...patch } });
  },

  addSeries(series) {
    const reel = get().reel;
    set({ reel: { ...reel, series: [...reel.series, series] } });
  },

  markExported(seriesId, exportedPath) {
    const reel = get().reel;
    const series = reel.series.find((x) => x.id === seriesId);
    if (!series) return;
    const at = new Date().toISOString();
    const next = patchMedia(reel, series.mediaIds, (m) => ({
      ...m,
      exportedTo: [...m.exportedTo, { series: seriesId, at }],
    }));
    next.series = reel.series.map((x) => (x.id === seriesId ? { ...x, exportedPath } : x));
    set({ reel: next });
  },

  setSaveState(saveState) {
    set({ saveState });
  },
}));
