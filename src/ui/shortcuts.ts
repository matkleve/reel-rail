import { t } from "@/i18n";

/** Single source for the shortcut overlay; README mirrors it. */
export const SHORTCUT_GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: t("Browse"),
    items: [
      [["←", "→"], t("Previous / next (wheel and swipe work too)")],
      [["Home", "End"], t("First / last")],
      [["Enter"], t("Open / close a burst")],
      [["+", "−", "0"], t("Zoom the timeline in / out / whole trip")],
    ],
  },
  {
    title: t("Rate & keep"),
    items: [
      [["↑"], t("Better rating")],
      [["↓"], t("Worse rating")],
      [["→", "←", "↑", "↓"], t("In Sort: good, bad, top, delete")],
      [["Z"], t("Undo the last rating")],
      [["X"], t("Open burst: all but the best → discard")],
      [[t("Space")], t("Pick: copy to your picks folder (again: undo)")],
    ],
  },
  {
    title: t("Select"),
    items: [
      [["Shift", "←/→"], t("Extend the selection")],
      [["⌘/Ctrl", t("Click")], t("Add or remove one item")],
      [["Esc"], t("Clear the selection")],
      [["S"], t("Create a series from the selection")],
    ],
  },
  {
    title: t("Describe & view"),
    items: [
      [["1–9"], t("Toggle a tag preset")],
      [["T"], t("Tag menu")],
      [["P"], t("Edit the place")],
      [["V", "M"], t("Video: play/pause, sound")],
      [["C"], t("Video: trim")],
      [["?"], t("This overlay")],
    ],
  },
];
