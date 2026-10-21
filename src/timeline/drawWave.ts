import type { Rating } from "@/types";

import { NEUTRAL, type Waves } from "./waveform";

/** Horizontal resolution of the wave, in px per bin. */
export const BIN_PX = 3;

const DOT_R: Record<Rating, number> = { [2]: 2.6, [1]: 2, [0]: 1.5, [-1]: 1.2, [-2]: 1 };

/** Resolves a CSS custom property (tokens live in CSS; the canvas needs real colours). */
function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** Deterministic jitter so dots of one moment fan out instead of stacking. */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/** Smooth path through points using midpoints as quadratic anchors. */
function curve(g: CanvasRenderingContext2D, pts: [number, number][], move: boolean): void {
  if (!pts.length) return;
  if (move) g.moveTo(pts[0]![0], pts[0]![1]);
  else g.lineTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!;
    const [nx, ny] = pts[i + 1]!;
    g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = pts.at(-1)!;
  g.lineTo(last[0], last[1]);
}

/**
 * The waveform: one glowing translucent wave per tag (its colour), floating
 * above the middle line where the shots are good and below where they are
 * weak; thickness is how many there are. A bright thin spine traces the
 * overall quality, and every medium is a small spark at its rating height.
 * Additive blending in the dark theme makes overlaps glow.
 */
export function drawWave(
  canvas: HTMLCanvasElement,
  waves: Waves,
  colorOf: (tag: string) => string,
  w: number,
  h: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const dark = document.documentElement.dataset.theme !== "light";
  const mid = h / 2;
  const step = (h / 2 - 14) / 2.4; // px per rating level
  const amp = h * 0.2; // thickness of the busiest moment

  g.fillStyle = token(canvas, "--color-line");
  g.fillRect(0, mid - 0.5, w, 1);
  g.globalCompositeOperation = dark ? "lighter" : "source-over";

  for (const layer of waves.layers) {
    const color = colorOf(layer.tag);
    const top: [number, number][] = [];
    const bottom: [number, number][] = [];
    layer.count.forEach((c, i) => {
      const x = (i + 0.5) * BIN_PX;
      const thick = Math.sqrt(c / waves.max) * amp;
      const y = mid - layer.mean[i]! * step * Math.min(1, c * 4);
      top.push([x, y - thick]);
      bottom.push([x, y + thick]);
    });
    g.beginPath();
    curve(g, top, true);
    curve(g, bottom.reverse(), false);
    g.closePath();
    g.shadowColor = color;
    g.shadowBlur = dark ? 14 : 4;
    g.globalAlpha = layer.tag === NEUTRAL ? 0.18 : dark ? 0.32 : 0.55;
    g.fillStyle = color;
    g.fill();
    g.globalAlpha = dark ? 0.75 : 0.6;
    g.lineWidth = 1;
    g.strokeStyle = color;
    g.stroke();
  }

  // The spine: overall average rating over time.
  g.globalAlpha = dark ? 0.55 : 0.6;
  g.shadowBlur = dark ? 8 : 0;
  g.shadowColor = token(canvas, "--color-ink");
  g.strokeStyle = token(canvas, "--color-ink");
  g.lineWidth = 1.2;
  g.beginPath();
  curve(
    g,
    waves.spine.map((r, i) => [(i + 0.5) * BIN_PX, mid - r * step]),
    true,
  );
  g.stroke();

  // Sparks: one per medium.
  g.shadowBlur = dark ? 6 : 0;
  waves.dots.forEach((d, i) => {
    const color = colorOf(d.tag);
    g.globalAlpha = d.rating >= 1 ? 0.95 : 0.6;
    g.fillStyle = color;
    g.shadowColor = color;
    g.beginPath();
    g.arc(d.at * w, mid - d.rating * step + jitter(i) * step * 0.5, DOT_R[d.rating], 0, Math.PI * 2);
    g.fill();
  });

  g.globalAlpha = 1;
  g.shadowBlur = 0;
  g.globalCompositeOperation = "source-over";
}

export function resolveColor(canvas: Element, cssVar: string): string {
  return token(canvas, cssVar.replace(/^var\((--[\w-]+)\)$/, "$1"));
}
