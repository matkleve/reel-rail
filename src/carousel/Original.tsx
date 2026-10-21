import { useEffect, useRef, useState } from "react";

import { getMediaFile } from "@/fs/session";
import type { Media } from "@/types";

import { TOGGLE_MUTE, TOGGLE_PLAY } from "./events";

/**
 * The full-resolution original for the centre card, laid over its thumbnail.
 * Videos start muted and looping; V plays/pauses, M toggles sound.
 */
export function Original({ media }: { media: Media }) {
  const [url, setUrl] = useState<string>();
  const [broken, setBroken] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let alive = true;
    let created: string | undefined;
    // A short delay keeps held-down arrow keys from decoding every 20 MB original on the way.
    const t = setTimeout(() => {
      void getMediaFile(media).then((file) => {
        if (!alive) return;
        created = URL.createObjectURL(file);
        setUrl(created);
      });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
      if (created) URL.revokeObjectURL(created);
    };
    // The path identifies the file on disk; ratings must not reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.path]);

  useEffect(() => {
    const play = () => {
      const v = video.current;
      if (v) void (v.paused ? v.play() : v.pause());
    };
    const mute = () => {
      if (video.current) video.current.muted = !video.current.muted;
    };
    window.addEventListener(TOGGLE_PLAY, play);
    window.addEventListener(TOGGLE_MUTE, mute);
    return () => {
      window.removeEventListener(TOGGLE_PLAY, play);
      window.removeEventListener(TOGGLE_MUTE, mute);
    };
  }, []);

  if (!url) return null;
  if (media.type === "video") {
    return <video ref={video} className="card-original" src={url} autoPlay muted loop playsInline />;
  }
  // HEIC does not decode in Chrome — the embedded-preview thumbnail underneath then stays visible.
  return broken ? null : <img className="card-original" src={url} alt="" draggable={false} onError={() => setBroken(true)} />;
}
