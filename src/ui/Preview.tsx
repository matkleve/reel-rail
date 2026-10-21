import { useEffect, useRef, useState } from "react";

import { getMediaFile } from "@/fs/session";
import { useReel } from "@/store/useReel";
import { useThumb } from "@/timeline/useThumb";
import type { Media } from "@/types";

export const TOGGLE_PLAY = "reel:toggle-play";

/** The large view of the current medium. Shows the thumbnail until the original has loaded. */
export function Preview() {
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  if (!media) return <div className="preview" />;
  return <PreviewOf key={media.id} media={media} />;
}

function PreviewOf({ media }: { media: Media }) {
  const thumb = useThumb(media);
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
    }, 90);
    return () => {
      alive = false;
      clearTimeout(t);
      if (created) URL.revokeObjectURL(created);
    };
    // Path is what identifies the file on disk; the component is keyed by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.path]);

  useEffect(() => {
    const toggle = () => {
      const v = video.current;
      if (!v) return;
      if (v.paused) void v.play();
      else v.pause();
    };
    window.addEventListener(TOGGLE_PLAY, toggle);
    return () => window.removeEventListener(TOGGLE_PLAY, toggle);
  }, []);

  const dim = media.rating < 0 ? " is-unusable" : "";
  return (
    <div className={`preview${dim}`}>
      {thumb.url && <img className="preview-thumb" src={thumb.url} alt="" />}
      {url && media.type === "video" && (
        <video ref={video} className="preview-media" src={url} controls playsInline />
      )}
      {url && media.type === "photo" && !broken && (
        // HEIC does not decode in Chrome — the thumbnail underneath then stays visible.
        <img className="preview-media" src={url} alt={media.path} onError={() => setBroken(true)} />
      )}
    </div>
  );
}
