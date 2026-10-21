import { ArchiveRestore, Trash2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { secondsLeft } from "@/fs/deletion";
import { graceMs } from "@/store/discards";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { DISCARD } from "@/types";

import { Button } from "./kit/Button";

/**
 * Above the dock while the current item is a discard: how long until it
 * leaves (the folder too, when it is edited in place), and one tap to keep it.
 */
export function LeavingBar() {
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  const inPlace = useReel((s) => s.reel.workflow === "edit") && useUi.getState().sourceKind === "folder";
  const [now, setNow] = useState(Date.now);
  const counting = media?.rating === DISCARD && !!media.discardedAt;

  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [counting]);

  if (!media || !counting) return null;
  const grace = graceMs() / 1000;
  const left = secondsLeft(media, now, graceMs());
  return (
    <div className="leaving" role="status" key={media.id}>
      <Trash2 size={15} aria-hidden="true" />
      <span className="tabular">
        {inPlace ? "Leaves the folder" : "Leaves"} in {Math.ceil(left)} s
      </span>
      <span
        className="leaving-bar"
        aria-hidden="true"
        style={{ "--grace": `${grace}s`, "--elapsed": `${grace - left}s` } as CSSProperties}
      />
      <Button
        size="sm"
        variant="secondary"
        icon={ArchiveRestore}
        onClick={() => useReel.getState().setRatings([{ id: media.id, rating: 0 }])}
      >
        Keep
      </Button>
    </div>
  );
}
