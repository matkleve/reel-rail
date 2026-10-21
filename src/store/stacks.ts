import type { Media } from "@/types";

/** Shots closer together than this are one burst. */
export const BURST_MS = 3000;

export type Stacks = {
  /** media id → stack id, only for media in a stack of ≥ 2. */
  stackOf: Record<string, string>;
  /** stack id → member ids in timeline order. */
  members: Record<string, string[]>;
};

/**
 * Groups consecutive media less than 3 s apart. The stack id is the id of its
 * first member, so it is stable as long as the burst itself is.
 */
export function computeStacks(order: string[], media: Record<string, Media>, burstMs = BURST_MS): Stacks {
  const stackOf: Record<string, string> = {};
  const members: Record<string, string[]> = {};
  let run: string[] = [];
  let prevT = -Infinity;

  const close = () => {
    if (run.length >= 2) {
      const sid = run[0]!;
      members[sid] = run;
      for (const id of run) stackOf[id] = sid;
    }
  };

  for (const id of order) {
    const t = Date.parse(media[id]!.takenAt);
    if (t - prevT < burstMs) run.push(id);
    else {
      close();
      run = [id];
    }
    prevT = t;
  }
  close();
  return { stackOf, members };
}

/** The member a collapsed stack shows: highest rating, earliest on ties. */
export function coverOf(memberIds: string[], media: Record<string, Media>): string {
  let best = memberIds[0]!;
  for (const id of memberIds) if (media[id]!.rating > media[best]!.rating) best = id;
  return best;
}

/** Whether an id is on the rail right now (not hidden inside a collapsed stack). */
export function isShown(
  id: string,
  stacks: Stacks,
  expanded: ReadonlySet<string>,
  media: Record<string, Media>,
): boolean {
  const sid = stacks.stackOf[id];
  return !sid || expanded.has(sid) || coverOf(stacks.members[sid]!, media) === id;
}

export function visibleOrder(
  order: string[],
  stacks: Stacks,
  expanded: ReadonlySet<string>,
  media: Record<string, Media>,
): string[] {
  return order.filter((id) => isShown(id, stacks, expanded, media));
}

/** Writes `stackId` into media (persisted), touching only what changed. */
export function applyStackIds(media: Record<string, Media>, stacks: Stacks): Record<string, Media> {
  let out = media;
  for (const [id, m] of Object.entries(media)) {
    const sid = stacks.stackOf[id];
    if (m.stackId === sid) continue;
    if (out === media) out = { ...media };
    const next = { ...m };
    if (sid) next.stackId = sid;
    else delete next.stackId;
    out[id] = next;
  }
  return out;
}
