import { create } from "zustand";

import type { ScanProgress } from "@/fs/scan";

export type Phase = "start" | "scanning" | "ready" | "error";
export type DialogKind = "createSeries" | "seriesList" | "help" | null;

type UiState = {
  phase: Phase;
  folderName?: string;
  progress?: ScanProgress;
  error?: string;
  dialog: DialogKind;
  /** Bumped to ask the place field to take focus (keyboard: P). */
  placeFocus: number;
  theme: "dark" | "light";
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
  theme: initialTheme(),
  set: (patch) => set(patch),
}));
