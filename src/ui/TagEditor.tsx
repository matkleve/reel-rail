import { useMemo, useState } from "react";

import { addTag, removeTag } from "@/store/actions";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Media } from "@/types";

import { tagColor } from "./tagColor";

/** Every tag in use plus the presets — the autocomplete source and the filter's options. */
export function useAllTags(): string[] {
  const media = useReel((s) => s.reel.media);
  const presets = useReel((s) => s.reel.tagPresets);
  return useMemo(() => {
    const set = new Set(presets.filter(Boolean));
    for (const m of Object.values(media)) for (const t of m.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [media, presets]);
}

/** The current item's tags as removable chips, plus the free-tag field (T). */
export function TagEditor({ media }: { media: Media }) {
  const presets = useReel((s) => s.reel.tagPresets);
  const editing = useUi((s) => s.tagEditing);
  const all = useAllTags();
  const [draft, setDraft] = useState("");
  const close = () => {
    setDraft("");
    useUi.getState().set({ tagEditing: false });
  };

  return (
    <span className="tag-editor">
      {media.tags.map((t) => (
        <span key={t} className="tag-chip is-removable" style={{ background: tagColor(t, presets) }}>
          {t}
          <button type="button" onClick={() => removeTag(media.id, t)} aria-label={`Remove tag ${t}`}>
            ×
          </button>
        </span>
      ))}
      {editing && (
        <>
          <input
            className="tag-input"
            list="reel-tags"
            value={draft}
            placeholder="Tag…"
            aria-label="Add tag"
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={close}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                addTag(draft);
                // Stay open for the next tag; an empty Enter closes.
                if (draft.trim()) setDraft("");
                else close();
              }
              if (e.key === "Escape") close();
            }}
          />
          <datalist id="reel-tags">
            {all.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      )}
    </span>
  );
}
