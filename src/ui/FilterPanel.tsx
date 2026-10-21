import { RotateCcw } from "lucide-react";

import { DEFAULT_FILTERS } from "@/store/filters";
import { useReel } from "@/store/useReel";

import { Switch } from "./kit/Switch";
import { useAllTags } from "./TagMenu";
import { tagStyle } from "./tagColor";

/** The filter button's panel: switches, then tags (any-of). */
export function FilterPanel() {
  const filters = useReel((s) => s.filters);
  const presets = useReel((s) => s.reel.tagPresets);
  const setFilters = useReel((s) => s.setFilters);
  const all = useAllTags();
  const toggle = (t: string) =>
    setFilters({ tags: filters.tags.includes(t) ? filters.tags.filter((x) => x !== t) : [...filters.tags, t] });

  return (
    <div className="filter-panel">
      <Switch label="Hide discards" checked={filters.hideDiscards} onChange={(v) => setFilters({ hideDiscards: v })} />
      <Switch label="Not exported yet" checked={filters.neverExported} onChange={(v) => setFilters({ neverExported: v })} />
      <hr />
      <div className="popover-label">Tags — show any of</div>
      <div className="tag-cloud">
        {all.map((t) => (
          <button
            key={t}
            type="button"
            className="tag tag-toggle"
            style={tagStyle(t, presets)}
            aria-pressed={filters.tags.includes(t)}
            onClick={() => toggle(t)}
          >
            <span>{t}</span>
          </button>
        ))}
      </div>
      <hr />
      <button type="button" className="menu-item" onClick={() => setFilters({ ...DEFAULT_FILTERS, rating: filters.rating })}>
        <RotateCcw size={15} /> Reset filters
      </button>
    </div>
  );
}
