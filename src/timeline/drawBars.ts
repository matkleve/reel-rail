import { LEVELS, type Bars, type Level } from "./timeModel";

/** At least this many px per bar (bar + gap): wide enough to read on a phone. */
export const BIN_PX = 10;
/**
 * At most this many bars. A wide screen gets wider bars, not more of them:
 * more bars would each hold fewer shots, and a row of one-shot slivers says
 * nothing about where the good part of a day was.
 */
export const MAX_BINS = 72;

export function binCount(width: number): number {
  return Math.max(1, Math.min(MAX_BINS, Math.floor(width / BIN_PX)));
}
const GAP = 2;
const BOTTOM = 6;
const RADIUS = 4;

/** The colour of each part of a bar — rating tokens, so bars and cards speak the same language. */
export const LEVEL_TOKEN: Record<Level, string> = {
  top: "--rating-2",
  good: "--rating-1",
  bad: "--rating-m1",
  unrated: "--bar-unrated",
};

/** Resolves a CSS custom property (tokens live in CSS; the canvas needs real colours). */
export function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Stacked bars, the best at the base. A level the filter hides is drawn
 * faint rather than left out, so the gaps it leaves stay visible — that is
 * where you go looking for fillers.
 */
export function drawBars(
  canvas: HTMLCanvasElement,
  bars: Bars,
  faint: ReadonlySet<Level>,
  size: { w: number; h: number; top: number },
): void {
  const { w, h, top } = size;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const base = h - BOTTOM;
  const room = Math.max(8, base - top);
  const colors = Object.fromEntries(LEVELS.map((l) => [l, token(canvas, LEVEL_TOKEN[l])])) as Record<Level, string>;
  const binW = w / Math.max(1, bars.bins.length);
  const barW = Math.max(1, binW - GAP);


  bars.bins.forEach((bin, i) => {
    const x = i * binW + GAP / 2;
    let y = base;
    for (const level of LEVELS) {
      const n = bin[level];
      if (!n) continue;
      // At least 2 px, so a single shot in a quiet hour still shows.
      const hgt = Math.max(2, (n / bars.max) * room);
      g.globalAlpha = faint.has(level) ? 0.22 : 1;
      g.fillStyle = colors[level];
      // Soft, rounded segments (the design has no hard corners); a plain rect where roundRect is missing.
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y - hgt, barW, hgt, Math.min(RADIUS, barW / 2, hgt / 2));
      else g.rect(x, y - hgt, barW, hgt);
      g.fill();
      y -= hgt + 2;
    }
  });
  g.globalAlpha = 1;
}
