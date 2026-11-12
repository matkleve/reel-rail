import { ChartColumn, PartyPopper, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { TOGGLE_PLAY } from "@/carousel/events";
import { t } from "@/i18n";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { Button } from "@/ui/kit/Button";
import { LeavingBar } from "@/ui/LeavingBar";

import { decide, deckOrder, restartDeck, topOf, undoDecision } from "./deck";
import { DeckActions } from "./DeckActions";
import { DeckCard } from "./DeckCard";
import type { Throw, Verdict } from "./deckGesture";
import { DeckNote } from "./DeckNote";
import { exitFor, type Exit } from "./flyOut";
import { DeckHint } from "./DeckHint";
import { THROW, UNDO_THROW } from "./events";
import { useDeckDrag, type At } from "./useDeckDrag";

/** A duration token in ms — the fly-out waits for the CSS transition it starts. */
function tokenMs(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000 || 0;
}

type Note = { verdict: Verdict; at: number };
type Leaving = { verdict: Verdict; exit: Exit };

/**
 * The phone: one card at a time, thrown right (good), left (bad — still a
 * filler), up (top) or down (delete). The next card waits underneath and grows
 * into place as you throw. Browsing back and forth is the timeline's job.
 */
export function SwipeDeck() {
  const s = useReel(
    useShallow((x) => ({
      order: x.order,
      stacks: x.stacks,
      expanded: x.expanded,
      currentId: x.currentId,
      filters: x.filters,
      reel: x.reel,
    })),
  );
  const ids = useMemo(() => deckOrder(s), [s]);
  const top = topOf(s);
  const [finishedAt, setFinishedAt] = useState<string>();
  const [leaving, setLeaving] = useState<Leaving>();
  const [note, setNote] = useState<Note>();
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const done = !top || finishedAt === top || !ids.includes(top);
  const next = done ? undefined : ids[ids.indexOf(top) + 1];

  /** Throws the top card from `from` (where the finger let go; at rest for a button or key). */
  const throwCard = (verdict: Verdict, from: At = { dx: 0, dy: 0 }) => {
    if (leaving || done) return;
    setLeaving({ verdict, exit: exitFor(verdict, from, { w: window.innerWidth, h: window.innerHeight }) });
    deckRef.current?.style.setProperty("--progress", "1");
    setTimeout(() => {
      if (!decide(verdict)) setFinishedAt(useReel.getState().currentId);
      deckRef.current?.style.setProperty("--progress", "0");
      setLeaving(undefined);
      setNote({ verdict, at: Date.now() });
    }, tokenMs("--dur-fly"));
  };
  const undo = () => {
    if (leaving || !undoDecision()) return;
    setFinishedAt(undefined);
    setNote(undefined);
  };

  const onRelease = (th: Throw, at: At) => {
    if (th.kind === "decide") throwCard(th.verdict, at);
    else if (th.kind === "tap" && top && s.reel.media[top]?.type === "video") window.dispatchEvent(new Event(TOGGLE_PLAY));
  };
  const drag = useDeckDrag(cardRef, deckRef, onRelease, !leaving && !done);

  // The current item may not pass a filter just switched on: deal the next one that does.
  useEffect(() => {
    if (!top || !ids.length || ids.includes(top)) return;
    const at = s.order.indexOf(top);
    useReel.getState().setCurrent(ids.find((id) => s.order.indexOf(id) > at) ?? ids.at(-1)!);
  }, [top, ids, s.order]);

  useDeckKeys(throwCard, undo);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(undefined), 3500);
    return () => clearTimeout(timer);
  }, [note]);

  const topMedia = !done && top ? s.reel.media[top] : undefined;

  return (
    <div className="deck-wrap">
      <div className="deck" ref={deckRef}>
        {next && <DeckCard key={next} media={s.reel.media[next]!} top={false} presets={s.reel.tagPresets} />}
        {topMedia && (
          <DeckCard
            key={topMedia.id}
            media={topMedia}
            top
            dragging={drag.active}
            leaving={leaving}
            presets={s.reel.tagPresets}
            handlers={drag.handlers}
            cardRef={cardRef}
          />
        )}
        {done && <Finished empty={ids.length === 0} />}
      </div>
      <LeavingBar />
      <DeckActions media={topMedia} onThrow={(v) => throwCard(v)} onUndo={undo} />
      <div className="deck-status">
        {note ? <DeckNote key={note.at} verdict={note.verdict} onUndo={undo} /> : !done && <DeckHint />}
      </div>
    </div>
  );
}

/** The keyboard throws too (useKeyboard sends events): the latest handlers, subscribed once. */
function useDeckKeys(throwCard: (v: Verdict) => void, undo: () => void) {
  const keys = useRef({ throwCard, undo });
  keys.current = { throwCard, undo };
  useEffect(() => {
    const onThrow = (e: Event) => keys.current.throwCard((e as CustomEvent<Verdict>).detail);
    const onUndo = () => keys.current.undo();
    window.addEventListener(THROW, onThrow);
    window.addEventListener(UNDO_THROW, onUndo);
    return () => {
      window.removeEventListener(THROW, onThrow);
      window.removeEventListener(UNDO_THROW, onUndo);
    };
  }, []);
}

function Finished({ empty }: { empty: boolean }) {
  const filtered = useReel((x) => x.filters.rating !== "all" || x.filters.tags.length > 0 || x.filters.hideDiscards || x.filters.neverExported);
  return (
    <div className="deck-done">
      <PartyPopper size={32} aria-hidden="true" />
      <h2>{empty ? t("Nothing to sort") : t("All sorted")}</h2>
      <p>
        {empty
          ? filtered
            ? t("Nothing passes the filters.")
            : t("No photos or videos here yet.")
          : t("That was the last one. The timeline shows where your top shots are.")}
      </p>
      {!empty && (
        <div className="deck-done-actions">
          <Button variant="primary" icon={ChartColumn} onClick={() => useUi.getState().set({ view: "timeline" })}>
            {t("Open the timeline")}
          </Button>
          <Button variant="secondary" icon={RotateCcw} onClick={restartDeck}>
            {t("Start over")}
          </Button>
        </div>
      )}
    </div>
  );
}
