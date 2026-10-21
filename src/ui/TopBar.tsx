import type { RatingFilter } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

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

      <span className="spacer" />
      <span className={`save-state ${saveState}`} aria-live="polite">
        {SAVE_LABEL[saveState]}
      </span>
      <button className="btn btn-ghost" onClick={() => set({ dialog: "seriesList" })}>
        Series{seriesCount ? ` (${seriesCount})` : ""}
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
