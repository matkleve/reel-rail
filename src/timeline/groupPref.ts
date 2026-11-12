import type { GroupBy } from "./groups";

/** The phone timeline's way of stacking, remembered per device. No imports: useUi reads it at startup. */
export const GROUP_BY_KEY = "reel-rail:group-by";

export function initialGroupBy(): GroupBy {
  try {
    const v = localStorage.getItem(GROUP_BY_KEY);
    return v === "single" || v === "time" || v === "place" ? v : "day";
  } catch {
    return "day";
  }
}
