import { ChartColumn, PartyPopper, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";

import { TOGGLE_PLAY } from "@/carousel/events";
import { graceMs } from "@/store/discards";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { Button } from "@/ui/kit/Button";
import { LeavingBar } from "@/ui/LeavingBar";

import { decide, deckOrder, restartDeck, topOf, undoDecision } from "./deck";
import { DeckActions } from "./DeckActions";
import { DeckCard } from "./DeckCard";
import { DECIDE_PX, type Throw, type Verdict } from "./deckGesture";
import { DeckHint } from "./DeckHint";
import { THROW, UNDO_THROW } from "./events";
import { useDeckDrag } from "./useDeckDrag";

/** A duration token in ms — the fly-out waits for the CSS transition it starts. */
function tokenMs(name: string): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000 || 0;
}

type Note = { verdict: Verdict; at: number };

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
  const [leaving, setLeaving] = useState<Verdict>();
  const [note, setNote] = useState<Note>();
  const done = !top || finishedAt === top || !ids.includes(top);
  const next = done ? undefined : ids[ids.indexOf(top) + 1];

  const throwCard = (verdict: Verdict) => {
    if (leaving || done) return;
    setLeaving(verdict);
    setTimeout(() => {
      if (!decide(verdict)) setFinishedAt(useReel.getState().currentId);
      setLeaving(undefined);
      setNote({ verdict, at: Date.now() });
    }, tokenMs("--dur-3"));
  };
  const undo = () => {
    if (leaving || !undoDecision()) return;
    setFinishedAt(undefined);
    setNote(undefined);
  };

  const onThrow = (t: Throw) => {
    if (t.kind === "decide") throwCard(t.verdict);
    else if (t.kind === "tap" && top && s.reel.media[top]?.type === "video") window.dispatchEvent(new Event(TOGGLE_PLAY));
  };
  const { drag, handlers } = useDeckDrag(onThrow, !leaving && !done);

  // The current item may not pass a filter just switched on: deal the next one that does.
  useEffect(() => {
    if (!top || !ids.length || ids.includes(top)) return;
    const at = s.order.indexOf(top);
    useReel.getState().setCurrent(ids.find((id) => s.order.indexOf(id) > at) ?? ids.at(-1)!);
  }, [top, ids, s.order]);

  useDeckKeys(throwCard, undo);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(undefined), 3500);
    return () => clearTimeout(t);
  }, [note]);

  const progress = leaving ? 1 : Math.min(1, Math.max(Math.abs(drag.dx), Math.abs(drag.dy)) / DECIDE_PX);
  const stackCount = (id: string) => {
    const sid = s.stacks.stackOf[id];
    return sid && !s.expanded.has(sid) ? s.stacks.members[sid]!.length : undefined;
  };
  const topMedia = !done && top ? s.reel.media[top] : undefined;

  return (
    <div className="deck-wrap">
      <div className="deck" style={{ "--progress": progress } as CSSProperties}>
        {next && <DeckCard key={next} media={s.reel.media[next]!} top={false} drag={drag} stackCount={stackCount(next)} presets={s.reel.tagPresets} />}
        {topMedia && (
          <DeckCard
            key={topMedia.id}
            media={topMedia}
            top
            drag={drag}
            leaving={leaving}
            stackCount={stackCount(topMedia.id)}
            presets={s.reel.tagPresets}
            handlers={handlers}
          />
        )}
        {done && <Finished empty={ids.length === 0} />}
        {note && <DeckNote key={note.at} verdict={note.verdict} onUndo={undo} />}
        {!done && <DeckHint />}
      </div>
      <LeavingBar />
      <DeckActions media={topMedia} onThrow={throwCard} onUndo={undo} />
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
      <h2>{empty ? "Nothing to sort" : "All sorted"}</h2>
      <p>{empty ? (filtered ? "Nothing passes the filters." : "No photos or videos here yet.") : "That was the last one. The timeline shows where your top shots are."}</p>
      {!empty && (
        <div className="deck-done-actions">
          <Button variant="primary" icon={ChartColumn} onClick={() => useUi.getState().set({ view: "timeline" })}>
            Open the timeline
          </Button>
          <Button variant="secondary" icon={RotateCcw} onClick={restartDeck}>
            Start over
          </Button>
        </div>
      )}
    </div>
  );
}

const NOTE_TEXT: Record<Verdict, string> = { good: "Good", top: "Top", bad: "Bad — kept as a filler", delete: "Deleted" };

/** What just happened, with one tap to take it back. */
function DeckNote({ verdict, onUndo }: { verdict: Verdict; onUndo(): void }) {
  const inPlace = useReel((x) => x.reel.workflow === "edit") && useUi.getState().sourceKind === "folder";
  const grace = Math.round(graceMs() / 1000);
  const text =
    verdict === "delete" ? `${inPlace ? "Leaves the folder" : "Deleted — leaves"} in ${grace} s` : NOTE_TEXT[verdict];
  return (
    <div className={`deck-note is-${verdict}`} role="status">
      <span className="deck-note-dot" aria-hidden="true" />
      {text}
      <Button size="sm" variant="secondary" onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}
