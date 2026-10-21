import { Ellipsis, Moon, Sun } from "lucide-react";

import { activeExtras, type RatingFilter } from "@/store/filters";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";

import { Button } from "./kit/Button";
import { Popover } from "./kit/Popover";
import { Segmented } from "./kit/Segmented";
import { FilterPanel } from "./FilterPanel";

/**
 * Phone header: what the desktop header shows in its centre (rating filter,
 * filter panel) and the theme switch, behind one button. The button carries
 * the number of active filters so a filtered view never goes unnoticed.
 */
export function MoreMenu({
  ratingOptions,
  onTheme,
}: {
  ratingOptions: { value: RatingFilter; label: string }[];
  onTheme(): void;
}) {
  const filters = useReel((s) => s.filters);
  const setFilters = useReel((s) => s.setFilters);
  const theme = useUi((s) => s.theme);
  const active = activeExtras(filters) + (filters.rating === "all" ? 0 : 1);

  return (
    <Popover
      align="end"
      className="more-menu"
      trigger={(p) => (
        <Button
          icon={Ellipsis}
          label="View and filter"
          variant={active ? "secondary" : "ghost"}
          count={active}
          {...p}
        />
      )}
    >
      <div className="popover-label">Show</div>
      <div className="more-show">
        <Segmented
          label="Show"
          options={ratingOptions}
          value={filters.rating}
          onChange={(rating) => setFilters({ rating })}
        />
      </div>
      <FilterPanel />
      <hr />
      <button type="button" className="menu-item" onClick={onTheme}>
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} {theme === "dark" ? "Light theme" : "Dark theme"}
      </button>
    </Popover>
  );
}
