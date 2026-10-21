import { pickPicksFolder } from "@/fs/picksFolder";
import type { RatingFilter } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { PICKS } from "@/types";

import { PickIcon } from "./icons";
import { TagFilter } from "./TagFilter";

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "like", label: "≥ Like" },
  { value: "top", label: "Top" },
  { value: "hideUnusable", label: "Hide unusable" },
];

const SAVE_LABEL = { idle: "", saving: "Saving…", saved: "Saved", error: "Save failed" } as const;

/** Compact filter bar plus the few global actions. */
export function TopBar() {
  const filters = useReel((s) => s.filters);
  const setFilters = useReel((s) => s.setFilters);
  const seriesCount = useReel((s) => s.reel.series.length);
  const saveState = useReel((s) => s.saveState);
  const unusable = useReel((s) => s.order.reduce((n, id) => n + (s.reel.media[id]!.rating < 0 ? 1 : 0), 0));
  const { folderName, theme, set } = useUi();

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("reel-rail:theme", next);
    } catch {
      // Private mode: the toggle still works for this session.
    }
    set({ theme: next });
  };

  return (
    <header className="topbar">
      <span className="brand small">reel-rail</span>
      <span className="muted folder" title={folderName}>
        {folderName}
      </span>

      <div className="segmented" role="radiogroup" aria-label="Rating filter">
        {RATING_OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={filters.rating === o.value}
            className={filters.rating === o.value ? "is-on" : ""}
            onClick={() => setFilters({ rating: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        className={filters.neverExported ? "chip is-on" : "chip"}
        aria-pressed={filters.neverExported}
        onClick={() => setFilters({ neverExported: !filters.neverExported })}
      >
        Never exported
      </button>
      <TagFilter />

      <span className="spacer" />
      <PicksButton />
      <span className={`save-state ${saveState}`} aria-live="polite">
        {SAVE_LABEL[saveState]}
      </span>
      <button className="btn btn-ghost" onClick={() => set({ dialog: "cleanup" })}>
        Unusable{unusable ? ` (${unusable})` : ""}
      </button>
      <button className="btn btn-ghost" onClick={() => set({ dialog: "seriesList" })}>
        Series{seriesCount ? ` (${seriesCount})` : ""}
      </button>
      <button className="btn btn-ghost icon" onClick={() => set({ dialog: "settings" })} aria-label="Settings">
        ⚙
      </button>
      <button className="btn btn-ghost icon" onClick={toggleTheme} aria-label="Toggle light/dark theme">
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <button className="btn btn-ghost icon" onClick={() => set({ dialog: "help" })} aria-label="Keyboard shortcuts">
        ?
      </button>
    </header>
  );
}

/** Shows where Space copies to; click to choose a different folder. */
function PicksButton() {
  const name = useUi((s) => s.picksFolderName);
  const count = useReel((s) => s.order.reduce((n, id) => n + (s.reel.media[id]!.exportedTo.some((e) => e.series === PICKS) ? 1 : 0), 0));
  const choose = async () => {
    try {
      const dir = await pickPicksFolder();
      useUi.getState().set({ picksFolderName: dir.name });
    } catch {
      // picker closed
    }
  };
  return (
    <button className="btn btn-ghost" onClick={() => void choose()} title="Space copies the current item here">
      <PickIcon size={14} /> {name ?? "Picks folder"}
      {count ? ` (${count})` : ""}
    </button>
  );
}
