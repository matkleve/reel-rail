import { Heart, RotateCcw, Scissors, Star, Tag as TagIcon, X } from "lucide-react";

import { TRIMMABLE } from "@/fs/trimVideo";
import { useUi } from "@/store/useUi";
import type { Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Popover } from "@/ui/kit/Popover";
import { TagPanel } from "@/ui/TagMenu";

import type { Verdict } from "./deckGesture";

type Props = { media?: Media; onThrow(v: Verdict): void; onUndo(): void };

/**
 * The round buttons under the deck — the same four throws for one thumb,
 * plus ↺. The fifth slot is what this item needs next: scissors for a
 * video that can be trimmed, tags for everything else.
 */
export function DeckActions({ media, onThrow, onUndo }: Props) {
  const off = !media;
  const trimmable = media?.type === "video" && TRIMMABLE.test(media.path);
  return (
    <div className="deck-actions" role="toolbar" aria-label="Decide">
      <Button className="deck-btn is-undo" icon={RotateCcw} label="Undo" tipSide="above" onClick={onUndo} />
      <Button className="deck-btn is-big is-discard" icon={X} label="Discard" tipSide="above" disabled={off} onClick={() => onThrow("discard")} />
      <Button className="deck-btn is-favorite" icon={Star} label="Favorite" tipSide="above" disabled={off} onClick={() => onThrow("favorite")} />
      <Button className="deck-btn is-big is-keep" icon={Heart} label="Keep" tipSide="above" disabled={off} onClick={() => onThrow("keep")} />
      {trimmable ? (
        <Button
          className="deck-btn is-tool"
          icon={Scissors}
          label="Trim video"
          kbd="C"
          tipSide="above"
          onClick={() => useUi.getState().set({ dialog: "trim" })}
        />
      ) : (
        <Popover
          side="above"
          align="end"
          className="tag-menu"
          trigger={(p) => <Button className="deck-btn is-tool" icon={TagIcon} label="Tags" kbd="T" tipSide="above" disabled={off} {...p} />}
        >
          <TagPanel />
        </Popover>
      )}
    </div>
  );
}
