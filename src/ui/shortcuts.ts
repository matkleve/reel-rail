/** Single source for the shortcut overlay; README mirrors it. */
export const SHORTCUT_GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Browse",
    items: [
      [["←", "→"], "Previous / next (wheel and swipe work too)"],
      [["Home", "End"], "First / last"],
      [["Enter"], "Open / close a burst"],
      [["+", "−", "0"], "Zoom the timeline in / out / whole trip"],
    ],
  },
  {
    title: "Rate & keep",
    items: [
      [["↑"], "Better — bigger and higher"],
      [["↓"], "Worse — smaller, slides down"],
      [["Z"], "Undo the last rating"],
      [["X"], "Open burst: all but the best → discard"],
      [["Space"], "Pick: copy to your picks folder (again: undo)"],
    ],
  },
  {
    title: "Select",
    items: [
      [["Shift", "←/→"], "Extend the selection"],
      [["⌘/Ctrl", "Click"], "Add or remove one item"],
      [["Esc"], "Clear the selection"],
      [["S"], "Create a series from the selection"],
    ],
  },
  {
    title: "Describe & view",
    items: [
      [["1–9"], "Toggle a tag preset"],
      [["T"], "Tag menu"],
      [["P"], "Edit the place"],
      [["V", "M"], "Video: play/pause, sound"],
      [["?"], "This overlay"],
    ],
  },
];
