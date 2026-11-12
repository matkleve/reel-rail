import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

import type { TrimRange } from "@/fs/trimVideo";
import { t } from "@/i18n";

import { clipIndexAt, gaps } from "./clips";

const FRAMES = 8;
/** The shortest clip worth keeping, in seconds. */
export const MIN_LENGTH = 0.5;

type Props = {
  url: string;
  duration: number;
  clips: TrimRange[];
  active: number;
  playhead: number;
  onChange(range: TrimRange, seekTo: number): void;
  onSeek(t: number): void;
  onSelect(i: number): void;
};

/**
 * A filmstrip with the clips to keep on it. The active clip has two handles:
 * drag them (finger or mouse) to keep the part between. Tapping another clip
 * makes it the active one; tapping elsewhere moves the playhead. Handles are
 * sliders for keyboard and screen readers too: ←/→ move 0.1 s, Shift ±1 s.
 */
export function TrimTrack({ url, duration, clips, active, playhead, onChange, onSeek, onSelect }: Props) {
  const { start, end } = clips[active] ?? { start: 0, end: duration };
  const track = useRef<HTMLDivElement>(null);
  const pct = (t: number) => `${(t / duration) * 100}%`;
  const timeAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - r.left) / r.width) * duration));
  };

  const set = (which: "start" | "end", t: number) => {
    if (which === "start") {
      const s = Math.max(0, Math.min(t, end - MIN_LENGTH));
      onChange({ start: s, end }, s);
    } else {
      const e = Math.min(duration, Math.max(t, start + MIN_LENGTH));
      onChange({ start, end: e }, e);
    }
  };

  const drag = (which: "start" | "end") => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => set(which, timeAt(ev.clientX));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const keys = (which: "start" | "end") => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 0.1;
    const now = which === "start" ? start : end;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      set(which, now + (e.key === "ArrowLeft" ? -step : step));
    }
  };

  return (
    <div
      className="trim-track"
      ref={track}
      onPointerDown={(e) => {
        const at = timeAt(e.clientX);
        const i = clipIndexAt(clips, at);
        if (i >= 0 && i !== active) onSelect(i);
        else onSeek(at);
      }}
    >
      <Filmstrip url={url} duration={duration} />
      <ClipFrames clips={clips} active={active} duration={duration} />
      <div className="trim-playhead" style={{ left: pct(playhead) }} />
      {(["start", "end"] as const).map((which) => (
        <button
          key={which}
          type="button"
          role="slider"
          className={`trim-handle is-${which}`}
          style={{ left: pct(which === "start" ? start : end) }}
          aria-label={which === "start" ? t("Trim start") : t("Trim end")}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round((which === "start" ? start : end) * 10) / 10}
          aria-valuetext={formatTime(which === "start" ? start : end)}
          onPointerDown={drag(which)}
          onKeyDown={keys(which)}
        />
      ))}
    </div>
  );
}

/** What is cut away (shaded) and each kept clip (framed; numbered when there are several). */
function ClipFrames({ clips, active, duration }: { clips: TrimRange[]; active: number; duration: number }) {
  const pct = (t: number) => `${(t / duration) * 100}%`;
  return (
    <>
      {gaps(clips, duration).map((g) => (
        <div key={g.start} className="trim-cut" style={{ left: pct(g.start), width: pct(g.end - g.start) }} />
      ))}
      {clips.map((c, i) => (
        <div
          key={i}
          className={i === active ? "trim-keep is-active" : "trim-keep"}
          style={{ left: pct(c.start), width: pct(c.end - c.start) }}
        >
          {clips.length > 1 && <span className="trim-keep-n">{i + 1}</span>}
        </div>
      ))}
    </>
  );
}

/** Eight frames across the clip, drawn as they decode (seeking one by one is what iOS handles best). */
function Filmstrip({ url, duration }: { url: string; duration: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !duration) return;
    let alive = true;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const g = c.getContext("2d");
    const seek = (t: number) =>
      new Promise<void>((resolve, reject) => {
        v.onseeked = () => resolve();
        v.onerror = () => reject(new Error("decode"));
        v.currentTime = t;
      });
    void (async () => {
      try {
        await new Promise((r) => (v.onloadeddata = r));
        const w = c.width / FRAMES;
        for (let i = 0; i < FRAMES && alive; i++) {
          await seek(((i + 0.5) / FRAMES) * duration);
          if (!alive || !g) break;
          // Cover-fit each frame into its cell.
          const s = Math.max(w / v.videoWidth, c.height / v.videoHeight);
          const dw = v.videoWidth * s;
          const dh = v.videoHeight * s;
          g.save();
          g.beginPath();
          g.rect(i * w, 0, w, c.height);
          g.clip();
          g.drawImage(v, i * w + (w - dw) / 2, (c.height - dh) / 2, dw, dh);
          g.restore();
        }
      } catch {
        // No filmstrip — the handles still work on the bare track.
      }
    })();
    return () => {
      alive = false;
      v.removeAttribute("src");
      v.load();
    };
  }, [url, duration]);

  return <canvas className="trim-film" ref={canvas} width={FRAMES * 80} height={56} aria-hidden="true" />;
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
