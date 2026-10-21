import type { Media, Rating } from "@/types";

/**
 * Where every card of the carousel goes. Pure — screen-space numbers only; the
 * 3D look (tilt, card rotation, floor) is CSS on top of this.
 *
 * The rating is position AND size: favorites grow and rise, weak shots
 * shrink and slide down, discards sink below the floor line. The current card is in the middle;
 * neighbours fall off in size with distance, sitting directly side by side.
 */

/** Card height per rating, as a fraction of the base height. */
export const RATING_SCALE: Record<Rating, number> = { [-2]: 0.2, [-1]: 0.58, 0: 0.74, 1: 0.88, 2: 1 };
/** How far a card rises above (or sinks below) the floor, as a fraction of stage height. */
export const LIFT: Record<Rating, number> = { [-2]: -0.1, [-1]: -0.045, 0: 0, 1: 0.045, 2: 0.09 };

/**
 * The stage, plus (portrait only) how much of it the date at the top and the
 * dock at the bottom cover — measured, so cards never slide under either.
 */
export type Stage = { w: number; h: number; top?: number; bottom?: number };

/**
 * The vertical band cards live in. Landscape: the whole stage, floor low
 * (room for the dock below). Portrait (phone, iPad upright): cards are
 * width-bound and the chrome above and below eats a big share of the height,
 * so the band is what is left between the date and the dock, and cards fill
 * more of it.
 */
function band(stage: Stage): { y: number; h: number; floor: number; base: number } {
  if (stage.h <= stage.w) return { y: 0, h: stage.h, floor: 0.8, base: 0.6 };
  const y = stage.top ?? 0;
  const h = Math.max(stage.h * 0.5, stage.h - y - (stage.bottom ?? 0));
  // A favourite's top lands at 0.88 - 0.09 - 0.76 = 3 % below the band's top.
  return { y, h, floor: 0.88, base: 0.76 };
}

/** Floor line / stage height (for the floor's CSS). */
export function floorFor(stage: Stage): number {
  const b = band(stage);
  return stage.h > 0 ? (b.y + b.h * b.floor) / stage.h : 0.8;
}

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
  /** Degrees; side cards turn toward the centre. */
  rotY: number;
};

export type DaySep = { key: string; x: number; date: Date };
export type CarouselLayout = { cards: CardPlace[]; seps: DaySep[] };

export function falloff(d: number): number {
  return d === 0 ? 1 : Math.max(0.3, 0.6 - 0.06 * (Math.abs(d) - 1));
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
  const maxW = stage.w * (stage.h > stage.w ? 0.84 : 0.7);
  const size = (id: string, d: number) => {
    const m = media[id]!;
    const aspect = Math.max(0.5, Math.min(2.2, aspectOf(id) ?? DEFAULT_ASPECT));
    let h = b.h * b.base * RATING_SCALE[m.rating] * falloff(d);
    if (d === 0 && h * aspect > maxW) h = maxW / aspect;
    return { w: h * aspect, h, bottom: b.y + b.h * (b.floor - LIFT[m.rating]) };
  };
  const place = (i: number, d: number, x: number) => {
    const { w, h, bottom } = size(ids[i]!, d);
    const rotY = d === 0 ? 0 : -Math.sign(d) * Math.min(18, 10 + 2 * Math.abs(d));
    const card = { id: ids[i]!, d, x, bottom, w, h, rotY };
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
