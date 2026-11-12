import { create } from "zustand";

import type { ScanProgress } from "@/fs/scan";
import { initialGroupBy } from "@/timeline/groupPref";
import type { GroupBy } from "@/timeline/groups";

export type Toast = { id: number; text: string; kind: "info" | "error" };
export type Phase = "start" | "scanning" | "ready" | "error";
export type DialogKind = "createSeries" | "seriesList" | "help" | "settings" | "cleanup" | "trim" | "workflow" | null;

type UiState = {
  phase: Phase;
  folderName?: string;
  /** Which kind of source is open — the UI offers folder or share actions accordingly. */
  sourceKind?: "folder" | "files";
  progress?: ScanProgress;
  error?: string;
  dialog: DialogKind;
  /** Bumped to ask the place field to take focus (keyboard: P). */
  placeFocus: number;
  /** The inline free-tag field (keyboard: T) is open. */
  tagEditing: boolean;
  theme: "dark" | "light";
  /** Timeline zoom: 1 = whole trip, larger = a shorter stretch of time. */
  timeZoom: number;
  /** The two screens: the swipe deck (sort) or the photo strip over the timeline. */
  view: "sort" | "timeline";
  /** Phone timeline: how the photos are stacked (src/timeline/groups.ts). */
  groupBy: GroupBy;
  /** Phone timeline: the stack fanned out into its photos (a Group key); none = all stacks. */
  openGroup?: string;
  /** Name of the Space-key picks folder, once known. */
  picksFolderName?: string;
  toast?: Toast;
  /** The system picker is open or handing files over (iOS copies videos out of Photos first). */
  handover: boolean;
  set(patch: Partial<Omit<UiState, "set">>): void;
};

function initialTheme(): "dark" | "light" {
  try {
    // Sand (light) is the default since 2026-11; dark only when someone chose it.
    return localStorage.getItem("reel-rail:theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** A phone starts on the deck; a big screen with a keyboard on the strip. */
function initialView(): "sort" | "timeline" {
  try {
    return window.matchMedia("(max-width: 600px)").matches ? "sort" : "timeline";
  } catch {
    return "timeline"; // no matchMedia (tests, old engines)
  }
}

export const useUi = create<UiState>()((set) => ({
  phase: "start",
  dialog: null,
  placeFocus: 0,
  tagEditing: false,
  theme: initialTheme(),
  timeZoom: 1,
  view: initialView(),
  groupBy: initialGroupBy(),
  handover: false,
  set: (patch) => set(patch),
}));

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** A short message at the bottom of the screen; replaces the previous one. */
export function showToast(text: string, kind: Toast["kind"] = "info"): void {
  const id = Date.now();
  useUi.getState().set({ toast: { id, text, kind } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (useUi.getState().toast?.id === id) useUi.getState().set({ toast: undefined });
  }, kind === "error" ? 6000 : 2600);
}
