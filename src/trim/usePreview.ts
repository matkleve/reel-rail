import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import { getMediaFile } from "@/fs/session";
import type { Media } from "@/types";

/**
 * The trim dialog's player: the original as an object URL, the kept range,
 * the playhead, and a preview that loops inside the kept part.
 */
export function usePreview(media: Media) {
  const [url, setUrl] = useState<string>();
  const [duration, setDuration] = useState(0);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

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
  const changeRange = (r: { start: number; end: number }, showAt: number) => {
    setRange(r);
    video.current?.pause();
    seek(showAt);
  };

  const videoProps = {
    ref: video,
    src: url,
    playsInline: true,
    preload: "auto",
    onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
      const d = e.currentTarget.duration;
      if (!Number.isFinite(d)) return;
      setDuration(d);
      setRange({ start: 0, end: d });
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
    range,
    playhead,
    playing,
    seek,
    togglePlay,
    changeRange,
    videoProps,
    pause: () => video.current?.pause(),
  };
}
