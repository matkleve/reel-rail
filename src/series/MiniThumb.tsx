import { useThumb } from "@/timeline/useThumb";
import type { Media } from "@/types";

export function MiniThumb({ media }: { media: Media }) {
  const thumb = useThumb(media);
  return thumb.url ? <img className="mini-thumb" src={thumb.url} alt="" /> : <span className="mini-thumb" />;
}
