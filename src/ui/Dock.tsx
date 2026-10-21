import { ArrowDownToLine, Check, Layers, Pause, X } from "lucide-react";

import { TOGGLE_PLAY } from "@/carousel/events";
import { togglePick } from "@/store/picks";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { PICKS } from "@/types";

import { Button } from "./kit/Button";
import { RatingControl } from "./RatingControl";
import { TagGroup } from "./TagMenu";

/**
 * The floating control dock under the photo: everything you do to the
 * current item (or the selection) is one click away here, and each control
 * names its shortcut in its tooltip — the mouse teaches the keyboard.
 */
export function Dock() {
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  const selected = useReel((s) => s.selection.size);
  if (!media) return null;
  const picked = media.exportedTo.some((e) => e.series === PICKS);
  const files = useUi.getState().sourceKind === "files";

  return (
    <div className="dock-wrap">
      {selected > 0 && (
        <div className="dock dock-selection" role="toolbar" aria-label="Selection">
          <span className="selection-count">
            <span className="tabular">{selected}</span> selected
          </span>
          <Button icon={Layers} variant="primary" size="sm" onClick={() => useUi.getState().set({ dialog: "createSeries" })}>
            Create series
          </Button>
          <Button icon={X} label="Clear selection" kbd="Esc" size="sm" tipSide="above" onClick={() => useReel.getState().clearSelection()} />
        </div>
      )}
      <div className="dock" role="toolbar" aria-label={selected ? "Selected items" : "Current item"}>
        <RatingControl value={media.rating} many={selected > 0} />
        <span className="divider-v" />
        <TagGroup media={media} />
        <span className="divider-v" />
        {media.type === "video" && (
          <Button
            className="dock-play"
            icon={Pause}
            label="Play / pause"
            kbd="V"
            tipSide="above"
            onClick={() => window.dispatchEvent(new Event(TOGGLE_PLAY))}
          />
        )}
        <Button
          className={picked ? "pick-btn is-picked" : "pick-btn"}
          icon={picked ? Check : ArrowDownToLine}
          variant={picked ? "secondary" : "ghost"}
          onClick={() => void togglePick()}
          title={
            files
              ? picked
                ? "Unpick (Space)"
                : "Pick — share all picks from the header (Space)"
              : picked
                ? "Take the copy back out (Space)"
                : "Copy to your picks folder (Space)"
          }
        >
          <span className="dock-label">{picked ? "Picked" : "Pick"}</span>
          <kbd className="kbd kbd-key">Space</kbd>
        </Button>
      </div>
    </div>
  );
}
