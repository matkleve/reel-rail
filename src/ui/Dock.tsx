import { ArrowDownToLine, Check, Layers, Pause, X } from "lucide-react";

import { TOGGLE_PLAY } from "@/carousel/events";
import { t } from "@/i18n";
import { togglePick } from "@/store/picks";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { PICKS } from "@/types";

import { Button } from "./kit/Button";
import { LeavingBar } from "./LeavingBar";
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
      {!selected && <LeavingBar />}
      {selected > 0 && (
        <div className="dock dock-selection" role="toolbar" aria-label={t("Selection")}>
          <span className="selection-count">
            <span className="tabular">{selected}</span> {t("selected")}
          </span>
          <Button icon={Layers} variant="primary" size="sm" onClick={() => useUi.getState().set({ dialog: "createSeries" })}>
            {t("Create series")}
          </Button>
          <Button icon={X} label={t("Clear selection")} kbd="Esc" size="sm" tipSide="above" onClick={() => useReel.getState().clearSelection()} />
        </div>
      )}
      <div className="dock" role="toolbar" aria-label={selected ? t("Selected items") : t("Current item")}>
        <RatingControl value={media.rating} many={selected > 0} />
        <span className="divider-v" />
        <TagGroup media={media} />
        <span className="divider-v" />
        {media.type === "video" && (
          <Button
            className="dock-play"
            icon={Pause}
            label={t("Play / pause")}
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
                ? t("Unpick (Space)")
                : t("Pick — share all picks from the header (Space)")
              : picked
                ? t("Take the copy back out (Space)")
                : t("Copy to your picks folder (Space)")
          }
        >
          <span className="dock-label">{picked ? t("Picked") : t("Pick")}</span>
          <kbd className="kbd kbd-key">{t("Space")}</kbd>
        </Button>
      </div>
    </div>
  );
}
