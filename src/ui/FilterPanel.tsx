import { RotateCcw } from "lucide-react";

import { t } from "@/i18n";
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
  const toggle = (tag: string) =>
    setFilters({ tags: filters.tags.includes(tag) ? filters.tags.filter((x) => x !== tag) : [...filters.tags, tag] });

  return (
    <div className="filter-panel">
      <Switch label={t("Hide discards")} checked={filters.hideDiscards} onChange={(v) => setFilters({ hideDiscards: v })} />
      <Switch label={t("Not exported yet")} checked={filters.neverExported} onChange={(v) => setFilters({ neverExported: v })} />
      <hr />
      <div className="popover-label">{t("Tags — show any of")}</div>
      <div className="tag-cloud">
        {all.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tag tag-toggle"
            style={tagStyle(tag, presets)}
            aria-pressed={filters.tags.includes(tag)}
            onClick={() => toggle(tag)}
          >
            <span>{tag}</span>
          </button>
        ))}
      </div>
      <hr />
      <button type="button" className="menu-item" onClick={() => setFilters({ ...DEFAULT_FILTERS, rating: filters.rating })}>
        <RotateCcw size={15} /> {t("Reset filters")}
      </button>
    </div>
  );
}
