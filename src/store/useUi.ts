import { create } from "zustand";

import type { ScanProgress } from "@/fs/scan";

export type Toast = { id: number; text: string; kind: "info" | "error" };
export type Phase = "start" | "scanning" | "ready" | "error";
export type DialogKind = "createSeries" | "seriesList" | "help" | "settings" | "cleanup" | null;

type UiState = {
  phase: Phase;
  folderName?: string;
  progress?: ScanProgress;
  error?: string;
  dialog: DialogKind;
  /** Bumped to ask the place field to take focus (keyboard: P). */
  placeFocus: number;
  /** The inline free-tag field (keyboard: T) is open. */
  tagEditing: boolean;
  theme: "dark" | "light";
  /** Waveform zoom: 1 = whole trip, larger = a shorter stretch of time. */
  waveZoom: number;
  /** Name of the Space-key picks folder, once known. */
  picksFolderName?: string;
  toast?: Toast;
  set(patch: Partial<Omit<UiState, "set">>): void;
};

function initialTheme(): "dark" | "light" {
  try {
    return localStorage.getItem("reel-rail:theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export const useUi = create<UiState>()((set) => ({
  phase: "start",
  dialog: null,
  placeFocus: 0,
  tagEditing: false,
  theme: initialTheme(),
  waveZoom: 1,
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
