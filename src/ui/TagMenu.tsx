import { Check, Tag as TagIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { addTag, removeTag, toggleTag } from "@/store/actions";
import { targetIds, useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import type { Media } from "@/types";

import { Button } from "./kit/Button";
import { Kbd } from "./kit/Kbd";
import { Popover } from "./kit/Popover";
import { tagStyle } from "./tagColor";

/** Every tag in use plus the presets — autocomplete source and filter options. */
export function useAllTags(): string[] {
  const media = useReel((s) => s.reel.media);
  const presets = useReel((s) => s.reel.tagPresets);
  return useMemo(() => {
    const set = new Set(presets.filter(Boolean));
    for (const m of Object.values(media)) for (const t of m.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [media, presets]);
}

/** Current tags as chips, and the tag menu: presets (1–9) plus a free-text field (T). */
export function TagGroup({ media }: { media: Media }) {
  const presets = useReel((s) => s.reel.tagPresets);
  const editing = useUi((s) => s.tagEditing);
  const trigger = useRef<HTMLButtonElement>(null);

  // T on the keyboard opens the same menu.
  useEffect(() => {
    if (!editing) return;
    useUi.getState().set({ tagEditing: false });
    if (!document.querySelector(".tag-menu:popover-open")) trigger.current?.click();
    // showPopover() is synchronous, the toggle event is not: focus now, so
    // keys typed right after T land in the field.
    document.querySelector<HTMLElement>(".tag-menu [data-autofocus]")?.focus();
  }, [editing]);

  return (
    <div className="dock-tags">
      {media.tags.slice(0, 3).map((t) => (
        <span key={t} className="tag" style={tagStyle(t, presets)}>
          <span>{t}</span>
          <button type="button" onClick={() => removeTag(media.id, t)} aria-label={`Remove tag ${t}`}>
            ×
          </button>
        </span>
      ))}
      {media.tags.length > 3 && <span className="text-3">+{media.tags.length - 3}</span>}
      <Popover
        side="above"
        className="tag-menu"
        trigger={(p) => (
          <Button ref={trigger} icon={TagIcon} label="Tags" kbd="T" tipSide="above" {...p} />
        )}
      >
        <TagPanel />
      </Popover>
    </div>
  );
}

function TagPanel() {
  const presets = useReel((s) => s.reel.tagPresets);
  // useShallow: targetIds builds a new array each call; compare its contents.
  const ids = useReel(useShallow((s) => targetIds(s)));
  const media = useReel((s) => s.reel.media);
  const has = (t: string) => ids.length > 0 && ids.every((id) => media[id]?.tags.includes(t));
  const all = useAllTags();
  const [draft, setDraft] = useState("");

  return (
    <div className="tag-panel">
      <input
        className="input"
        list="reel-tags"
        value={draft}
        placeholder="New tag…"
        aria-label="New tag"
        data-autofocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && draft.trim()) {
            addTag(draft);
            setDraft("");
          }
        }}
      />
      <datalist id="reel-tags">
        {all.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="popover-label">Presets</div>
      {presets.map(
        (t, i) =>
          t && (
            <button key={t} type="button" className="menu-item" onClick={() => toggleTag(t)}>
              <span className="tag-dot" style={tagStyle(t, presets)} />
              {t}
              {has(t) && <Check size={14} className="menu-check" />}
              <Kbd>{String(i + 1)}</Kbd>
            </button>
          ),
      )}
    </div>
  );
}
