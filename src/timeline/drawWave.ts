import type { Bins } from "./waveform";

export const BAR = 3;
export const BAR_GAP = 1;

function token(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Mirrored bars around the middle line, like an audio waveform. Height is the
 * number of media in that slice of time (square-rooted so one busy minute does
 * not flatten the rest); the liked share is drawn in the accent colour, and
 * slices holding a top shot get a star-coloured dot.
 */
export function drawWave(canvas: HTMLCanvasElement, bins: Bins, w: number, h: number): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const mid = h / 2;
  const amp = mid - 10;
  const colors = {
    base: token(canvas, "--color-wave"),
    liked: token(canvas, "--color-accent"),
    top: token(canvas, "--color-star"),
    line: token(canvas, "--color-line"),
  };

  g.fillStyle = colors.line;
  g.fillRect(0, mid - 0.5, w, 1);

  bins.count.forEach((n, i) => {
    if (!n) return;
    const x = i * (BAR + BAR_GAP);
    const half = Math.max(1.5, Math.sqrt(n / bins.max) * amp);
    g.fillStyle = colors.base;
    g.beginPath();
    g.roundRect(x, mid - half, BAR, half * 2, 1.5);
    g.fill();

    const liked = bins.liked[i]!;
    if (liked) {
      const lh = half * (liked / n);
      g.fillStyle = colors.liked;
      g.beginPath();
      g.roundRect(x, mid - lh, BAR, lh * 2, 1.5);
      g.fill();
    }
    if (bins.top[i]) {
      g.fillStyle = colors.top;
      g.beginPath();
      g.arc(x + BAR / 2, mid - half - 5, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  });
}
