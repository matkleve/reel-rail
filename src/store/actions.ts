import { DISCARD, type Rating } from "@/types";

import { coverOf } from "./stacks";
import { targetIds, useReel } from "./useReel";

/**
 * Actions that compose the store's primitives. Plain functions rather than
 * store methods so useReel stays the small core (state + the undoable rating
 * path) and these can grow without growing it.
 */

const get = () => useReel.getState();

export function setPlace(ids: string[], place: string): void {
  const value = place.trim();
  get().patch(ids, (m) => {
    const next = { ...m };
    if (value) next.place = value;
    else delete next.place;
    return next;
  });
}

/** Keys 1–9: if every target has the tag, remove it from all; else add it to all. */
export function toggleTag(tag: string): void {
  const s = get();
  const ids = targetIds(s).filter((id) => s.reel.media[id]);
  if (!ids.length) return;
  const all = ids.every((id) => s.reel.media[id]!.tags.includes(tag));
  s.patch(ids, (m) => ({
    ...m,
    tags: all ? m.tags.filter((t) => t !== tag) : m.tags.includes(tag) ? m.tags : [...m.tags, tag],
  }));
}

export function addTag(tag: string): void {
  const value = tag.trim();
  const s = get();
  if (!value) return;
  s.patch(targetIds(s), (m) => (m.tags.includes(value) ? m : { ...m, tags: [...m.tags, value] }));
}

export function removeTag(id: string, tag: string): void {
  get().patch([id], (m) => ({ ...m, tags: m.tags.filter((t) => t !== tag) }));
}

export function setTagPresets(presets: string[]): void {
  const reel = get().reel;
  useReel.setState({ reel: { ...reel, tagPresets: presets.map((p) => p.trim()) } });
}

/** Enter: open / close the burst the current item belongs to. */
export function toggleStack(): void {
  const s = get();
  const sid = s.currentId ? s.stacks.stackOf[s.currentId] : undefined;
  if (!sid) return;
  const expanded = new Set(s.expanded);
  if (expanded.has(sid)) {
    expanded.delete(sid);
    // Land on what stays visible, so the rail does not lose the cursor.
    useReel.setState({ expanded, currentId: coverOf(s.stacks.members[sid]!, s.reel.media), selection: new Set() });
  } else {
    expanded.add(sid);
    useReel.setState({ expanded });
  }
}

/** X in an open burst: everything except the cover becomes a discard (one undo step). */
export function rejectStackRest(): void {
  const s = get();
  const sid = s.currentId ? s.stacks.stackOf[s.currentId] : undefined;
  if (!sid || !s.expanded.has(sid)) return;
  const members = s.stacks.members[sid]!;
  const cover = coverOf(members, s.reel.media);
  s.setRatings(members.filter((id) => id !== cover).map((id) => ({ id, rating: DISCARD })));
}

/** Clicking a level in the dock: set the rating of the current item / selection (one undo step). */
export function rateTo(rating: Rating): void {
  const s = get();
  s.setRatings(targetIds(s).map((id) => ({ id, rating })));
}
