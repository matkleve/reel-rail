import { ChartColumn, Layers } from "lucide-react";

import { useUi } from "@/store/useUi";

const TABS = [
  { view: "sort", label: "Sort", icon: Layers },
  { view: "timeline", label: "Timeline", icon: ChartColumn },
] as const;

/**
 * The phone's two screens, at the thumb: sort (the swipe deck) and the
 * timeline (photos side by side, bars underneath — where are the top shots,
 * where do fillers have to do).
 */
export function PhoneTabs() {
  const view = useUi((s) => s.phoneView);
  return (
    <nav className="phone-tabs" aria-label="Screens">
      {TABS.map(({ view: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          className={v === view ? "phone-tab is-active" : "phone-tab"}
          aria-current={v === view ? "page" : undefined}
          onClick={() => useUi.getState().set({ phoneView: v })}
        >
          <Icon size={22} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
