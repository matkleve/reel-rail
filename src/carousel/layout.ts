import type { Media } from "@/types";

/**
 * Where every card of the photo strip goes. Pure — screen-space numbers only.
 *
 * A flat strip: every card is the same size whatever its rating; the rating
 * is a chip on the card. (Until 2026-11 the rating was size and height —
 * favourites rose, weak shots sank. The user dropped it: a "bad" shot may be
 * the filler a series needs, and shrunk and sunk it was too small to judge.)
 * The current card is big in the middle; neighbours are a step smaller, side
 * by side, in time order, all on one centre line.
 */

/**
 * The stage, plus how much of it the date at the top and the dock at the
 * bottom cover — measured, so cards never slide under either.
 */
export type Stage = { w: number; h: number; top?: number; bottom?: number };

/** The band cards live in: what is left between the date and the dock. */
function band(stage: Stage): { y: number; h: number } {
  const y = stage.top ?? 0;
  return { y, h: Math.max(stage.h * 0.5, stage.h - y - (stage.bottom ?? 0)) };
}

/** The current card's height as a share of the band. */
const FILL = 0.9;
const GAP = 14;
const DAY_GAP = 72;
const MAX_SIDE = 24; // cards per side, upper bound
const DEFAULT_ASPECT = 4 / 3;

export type CardPlace = {
  id: string;
  /** Signed distance from the current card, in cards. */
  d: number;
  /** Centre x. */
  x: number;
  /** y of the card's bottom edge. */
  bottom: number;
  w: number;
  h: number;
};

export type DaySep = { key: string; x: number; date: Date };
export type CarouselLayout = { cards: CardPlace[]; seps: DaySep[] };

export function falloff(d: number): number {
  return d === 0 ? 1 : Math.max(0.4, 0.62 - 0.05 * (Math.abs(d) - 1));
}

function dayKey(iso: string): string {
  const t = new Date(iso);
  return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
}

export function layoutCarousel(
  ids: string[],
  current: number,
  media: Record<string, Media>,
  aspectOf: (id: string) => number | undefined,
  stage: Stage,
): CarouselLayout {
  const cards: CardPlace[] = [];
  const seps: DaySep[] = [];
  if (current < 0 || current >= ids.length || stage.w <= 0) return { cards, seps };

  const b = band(stage);
  // A panorama in the centre must still leave room for its neighbours — on a
  // narrow portrait screen only a sliver of them, the photo matters more.
  const maxW = stage.w * (stage.h > stage.w ? 0.84 : 0.56);
  const mid = b.y + b.h / 2;
  const size = (id: string, d: number) => {
    const aspect = Math.max(0.5, Math.min(2.2, aspectOf(id) ?? DEFAULT_ASPECT));
    let h = b.h * FILL * falloff(d);
    if (d === 0 && h * aspect > maxW) h = maxW / aspect;
    return { w: h * aspect, h, bottom: mid + h / 2 };
  };
  const place = (i: number, d: number, x: number) => {
    const { w, h, bottom } = size(ids[i]!, d);
    const card = { id: ids[i]!, d, x, bottom, w, h };
    cards.push(card);
    return card;
  };

  const center = place(current, 0, stage.w / 2);

  for (const dir of [1, -1] as const) {
    let edge = center.x + (dir * center.w) / 2;
    for (let d = 1; d <= MAX_SIDE; d++) {
      const i = current + dir * d;
      const prev = ids[i - dir];
      const id = ids[i];
      if (!id || !prev) break;
      const f = falloff(d);
      const [a, b] = dir === 1 ? [prev, id] : [id, prev];
      if (dayKey(media[a]!.takenAt) !== dayKey(media[b]!.takenAt)) {
        // The separator belongs to the later day.
        seps.push({ key: dayKey(media[b]!.takenAt), x: edge + (dir * DAY_GAP * f) / 2, date: new Date(media[b]!.takenAt) });
        edge += dir * DAY_GAP * f;
      }
      const { w } = size(id, d * dir);
      const card = place(i, d * dir, edge + dir * (GAP * f + w / 2));
      edge = card.x + (dir * card.w) / 2;
      if (dir === 1 ? edge - card.w > stage.w * 1.15 : edge + card.w < -stage.w * 0.15) break;
    }
  }
  return { cards, seps };
}
