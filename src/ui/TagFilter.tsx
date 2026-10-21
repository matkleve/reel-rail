import { useReel } from "@/store/useReel";

import { useAllTags } from "./TagEditor";
import { tagColor } from "./tagColor";

/** Multi-select tag filter in a native popover (top layer, light-dismiss, Esc — for free). */
export function TagFilter() {
  const selected = useReel((s) => s.filters.tags);
  const presets = useReel((s) => s.reel.tagPresets);
  const setFilters = useReel((s) => s.setFilters);
  const all = useAllTags();

  const toggle = (t: string) =>
    setFilters({ tags: selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t] });

  return (
    <>
      <button className={selected.length ? "chip is-on" : "chip"} popoverTarget="tag-filter">
        {selected.length ? `Tags: ${selected.join(", ")}` : "Tags"} ▾
      </button>
      <div id="tag-filter" popover="auto" className="popover">
        <p className="muted small">Show items with any of:</p>
        <div className="tag-options">
          {all.map((t) => (
            <label key={t} className="tag-option">
              <input type="checkbox" checked={selected.includes(t)} onChange={() => toggle(t)} />
              <span className="tag-swatch" style={{ background: tagColor(t, presets) }} />
              {t}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button className="btn btn-ghost" onClick={() => setFilters({ tags: [] })}>
            Clear tag filter
          </button>
        )}
      </div>
    </>
  );
}
