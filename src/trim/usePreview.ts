import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type SyntheticEvent } from "react";

import { getMediaFile } from "@/fs/session";
import type { TrimRange } from "@/fs/trimVideo";
import type { Media } from "@/types";

import { clipAt, inOrder } from "./clips";

const NONE: TrimRange = { start: 0, end: 0 };

/**
 * The trim dialog's player: the original as an object URL, the clips to
 * keep (one to start with — a plain trim), which one is being edited, the
 * playhead, and a preview that loops inside the active clip.
 */
export function usePreview(media: Media) {
  const [url, setUrl] = useState<string>();
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState<TrimRange[]>([]);
  const [active, setActive] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const range = clips[active] ?? NONE;

  useEffect(() => {
    let made: string | undefined;
    void getMediaFile(media).then((f) => setUrl((made = URL.createObjectURL(f))));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [media]);

  const seek = (t: number) => {
    if (video.current) video.current.currentTime = t;
    setPlayhead(t);
  };

  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < range.start || v.currentTime >= range.end - 0.05) v.currentTime = range.start;
      void v.play();
    } else v.pause();
  };

  /** Moving a handle pauses and shows the frame at the handle. */
  const changeRange = (r: TrimRange, showAt: number) => {
    setClips((all) => all.map((c, i) => (i === active ? r : c)));
    video.current?.pause();
    seek(showAt);
  };

  const { addClip, selectClip, removeClip } = clipOps({ clips, setClips, setActive, duration, playhead, seek, pause: () => video.current?.pause() });

  const videoProps = {
    ref: video,
    src: url,
    playsInline: true,
    preload: "auto",
    onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
      const d = e.currentTarget.duration;
      if (!Number.isFinite(d)) return;
      setDuration(d);
      // A trim kept as a decision (folder left as it is) opens where it was left.
      setClips([media.trim ? { start: media.trim.start, end: Math.min(d, media.trim.end) } : { start: 0, end: d }]);
      setActive(0);
    },
    onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (!v.paused && v.currentTime >= range.end) v.currentTime = range.start;
      setPlayhead(v.currentTime);
    },
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
  };

  return {
    url,
    duration,
    clips,
    active,
    range,
    playhead,
    playing,
    seek,
    togglePlay,
    changeRange,
    addClip,
    selectClip,
    removeClip,
    videoProps,
    pause: () => video.current?.pause(),
  };
}

type ClipOpsArgs = {
  clips: TrimRange[];
  setClips: Dispatch<SetStateAction<TrimRange[]>>;
  setActive: Dispatch<SetStateAction<number>>;
  duration: number;
  playhead: number;
  seek(t: number): void;
  pause(): void;
};

/** Adding, picking and dropping clips — each pauses, and shows the frame where the clip starts. */
function clipOps({ clips, setClips, setActive, duration, playhead, seek, pause }: ClipOpsArgs) {
  return {
    /** Another clip, at the playhead — it becomes the one being edited. */
    addClip() {
      pause();
      // Numbered in video order — as the saved files are — so a new clip takes its place among them.
      const next = clipAt(playhead, duration);
      const all = inOrder([...clips, next]);
      setClips(all);
      setActive(all.indexOf(next));
      seek(next.start);
    },
    selectClip(i: number) {
      const c = clips[i];
      if (!c) return;
      pause();
      setActive(i);
      seek(c.start);
    },
    /** The last clip stays: no clips would be nothing to save. */
    removeClip(i: number) {
      if (clips.length < 2) return;
      pause();
      setClips((all) => all.filter((_, j) => j !== i));
      setActive((a) => (a > i ? a - 1 : a === i ? Math.max(0, i - 1) : a));
    },
  };
}
