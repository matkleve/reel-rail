import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleAlert,
  FolderOpen,
  Keyboard,
  Layers,
  LoaderCircle,
  Moon,
  Settings,
  Share,
  SlidersHorizontal,
  Sun,
  Trash2,
} from "lucide-react";

import { pickPicksFolder } from "@/fs/picksFolder";
import { activeExtras, type RatingFilter } from "@/store/filters";
import { pickAndOpen } from "@/store/openSource";
import { sharePicks } from "@/store/picks";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { DISCARD, PICKS } from "@/types";

import { Button } from "./kit/Button";
import { Kbd } from "./kit/Kbd";
import { Popover } from "./kit/Popover";
import { Segmented } from "./kit/Segmented";
import { Logo } from "./Logo";
import { FilterPanel } from "./FilterPanel";
import { LibraryMenu } from "./LibraryMenu";

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "good", label: "Good +" },
  { value: "favorite", label: "Favorites" },
];

/** Brand + folder on the left, what you see in the middle, where things go on the right. */
export function Header() {
  const filters = useReel((s) => s.filters);
  const setFilters = useReel((s) => s.setFilters);
  const seriesCount = useReel((s) => s.reel.series.length);
  const counts = useReel((s) => {
    let discards = 0;
    let picks = 0;
    for (const id of s.order) {
      const m = s.reel.media[id]!;
      if (m.rating === DISCARD) discards++;
      if (m.exportedTo.some((e) => e.series === PICKS)) picks++;
    }
    return `${discards}:${picks}`;
  });
  const [discards, picks] = counts.split(":").map(Number) as [number, number];
  const { theme, set } = useUi();
  const files = useUi((s) => s.sourceKind === "files");
  const extras = activeExtras(filters);

  return (
    <header className="header">
      <div className="header-left">
        <span className="wordmark">
          <Logo />
          reel-rail
        </span>
        {files ? <LibraryMenu /> : <FolderMenu />}
      </div>

      <div className="header-center">
        <Segmented
          label="Show"
          options={RATING_OPTIONS}
          value={filters.rating}
          onChange={(rating) => setFilters({ rating })}
        />
        <Popover
          trigger={(p) => (
            <Button icon={SlidersHorizontal} variant={extras ? "secondary" : "ghost"} count={extras} title="Filter" {...p}>
              <span className="btn-label is-minor">Filter</span>
            </Button>
          )}
        >
          <FilterPanel />
        </Popover>
      </div>

      <div className="header-right">
        <SaveState />
        {files ? (
          <Button icon={Share} count={picks} onClick={() => void sharePicks()} title="Share all picks — Photos, Files, AirDrop…">
            <span className="btn-label">Share picks</span>
          </Button>
        ) : (
          <Button icon={ArrowDownToLine} count={picks} onClick={() => void choosePicks()} title="Where Space copies to">
            <span className="btn-label">Picks</span>
          </Button>
        )}
        <Button icon={Layers} count={seriesCount} onClick={() => set({ dialog: "seriesList" })} title="Series">
          <span className="btn-label">Series</span>
        </Button>
        <Button icon={Trash2} count={discards} onClick={() => set({ dialog: "cleanup" })} title="Discards">
          <span className="btn-label">Discards</span>
        </Button>
        <span className="divider-v" />
        <Button
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light theme" : "Dark theme"}
          onClick={() => toggleTheme(theme)}
        />
        <Button icon={Keyboard} label="Keyboard shortcuts" kbd="?" onClick={() => set({ dialog: "help" })} />
      </div>
    </header>
  );
}

function FolderMenu() {
  const folderName = useUi((s) => s.folderName);
  const picksName = useUi((s) => s.picksFolderName);
  const close = () => document.querySelector<HTMLElement>(".popover:popover-open")?.hidePopover();
  return (
    <Popover
      align="start"
      trigger={(p) => (
        <button type="button" className="folder-btn" {...p}>
          <FolderOpen size={15} aria-hidden="true" />
          <span>{folderName}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      )}
    >
      <button type="button" className="menu-item" onClick={() => (close(), void pickAndOpen())}>
        <FolderOpen size={15} /> Open another folder…
      </button>
      <button type="button" className="menu-item" onClick={() => (close(), void choosePicks())}>
        <ArrowDownToLine size={15} /> Picks folder: {picksName ?? "not set"}
      </button>
      <hr />
      <button type="button" className="menu-item" onClick={() => (close(), useUi.getState().set({ dialog: "settings" }))}>
        <Settings size={15} /> Tag presets…
      </button>
      <button type="button" className="menu-item" onClick={() => (close(), useUi.getState().set({ dialog: "help" }))}>
        <Keyboard size={15} /> Keyboard shortcuts <Kbd>?</Kbd>
      </button>
    </Popover>
  );
}

function SaveState() {
  const state = useReel((s) => s.saveState);
  if (state === "idle") return null;
  const [Icon, text] =
    state === "saving" ? [LoaderCircle, "Saving"] : state === "error" ? [CircleAlert, "Not saved"] : [Check, "Saved"];
  return (
    <span className={`save-state is-${state}`} aria-live="polite" title={`.reel.json — ${text}`}>
      <Icon size={13} aria-hidden="true" />
      {text}
    </span>
  );
}

async function choosePicks() {
  try {
    const dir = await pickPicksFolder();
    useUi.getState().set({ picksFolderName: dir.name });
  } catch {
    // picker closed
  }
}

function toggleTheme(theme: "dark" | "light") {
  const next = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("reel-rail:theme", next);
  } catch {
    // Private mode: the toggle still works for this session.
  }
  useUi.getState().set({ theme: next });
}
