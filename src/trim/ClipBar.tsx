import { Plus, Scissors, Share, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { canShareFiles } from "@/fs/share";
import type { TrimRange } from "@/fs/trimVideo";
import { t, tn } from "@/i18n";
import { KEEP_DAYS } from "@/types";
import { Button } from "@/ui/kit/Button";

import { formatTime } from "./TrimTrack";

export type Phase = { kind: "edit" } | { kind: "saving"; progress: number } | { kind: "share"; files: File[] };
export type TrimMode = "files" | "edit" | "export";

type BarProps = {
  clips: TrimRange[];
  active: number;
  keepWhole: boolean;
  onSelect(i: number): void;
  onRemove(i: number): void;
  onAdd(): void;
  onKeepWhole(keep: boolean): void;
};

/**
 * Under the track: the clips as chips (tap to edit one, × to drop it),
 * "Add clip" at the playhead, and whether the whole video stays.
 */
export function ClipBar({ clips, active, keepWhole, onSelect, onRemove, onAdd, onKeepWhole }: BarProps) {
  const row = useRef<HTMLDivElement>(null);
  // The clip being edited stays in view in the sideways row.
  useEffect(() => {
    row.current?.querySelector(".clip-chip.is-active")?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [active, clips.length]);
  return (
    <div className="clip-bar">
      {clips.length > 1 && (
        <div className="clip-chips" role="list" aria-label={t("Clips")} ref={row}>
          {clips.map((c, i) => (
            <span key={i} role="listitem" className={i === active ? "clip-chip is-active" : "clip-chip"}>
              <button type="button" className="clip-chip-pick" aria-pressed={i === active} onClick={() => onSelect(i)}>
                <strong>{i + 1}</strong>
                <span className="tabular">
                  {formatTime(c.start)}–{formatTime(c.end)}
                </span>
              </button>
              <button
                type="button"
                className="clip-chip-x"
                aria-label={t("Remove clip {n}", { n: i + 1 })}
                onClick={() => onRemove(i)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="clip-actions">
        <Button variant="secondary" icon={Plus} onClick={onAdd}>
          {t("Add clip")}
        </Button>
        <label className="clip-keep">
          <input type="checkbox" checked={keepWhole} onChange={(e) => onKeepWhole(e.currentTarget.checked)} />
          {t("Keep the whole video")}
        </label>
      </div>
    </div>
  );
}

type FooterProps = {
  phase: Phase;
  mode: TrimMode;
  /** One clip that replaces the original (the plain trim). */
  plain: boolean;
  count: number;
  keepWhole: boolean;
  canSave: boolean;
  onCancel(): void;
  onSave(): void;
  onShare(files: File[]): void;
};

/** Edit → saving (progress) → share (files mode only). */
export function TrimFooter({ phase, mode, plain, count, keepWhole, canSave, onCancel, onSave, onShare }: FooterProps) {
  if (phase.kind === "share") {
    const one = phase.files.length === 1;
    return (
      <div className="footer-row" key="share">
        <span className="note">
          {plain
            ? t("Trimmed. Save it to Photos, then delete the original there.")
            : one
              ? t("Clip ready. Save it to Photos.")
              : t("{n} clips ready. Save them to Photos.", { n: phase.files.length })}
        </span>
        <span className="spacer" />
        <Button variant="primary" icon={Share} onClick={() => onShare(phase.files)} autoFocus>
          {canShareFiles(phase.files) ? t("Save to Photos…") : t("Download")}
        </Button>
      </div>
    );
  }
  if (phase.kind === "saving")
    return (
      <div className="footer-row" key="saving">
        <div className="progress trim-progress">
          <div className="progress-bar" style={{ width: `${Math.round(phase.progress * 100)}%` }} />
        </div>
        <span className="text-2 tabular">{t("Trimming… {pct} %", { pct: Math.round(phase.progress * 100) })}</span>
      </div>
    );
  return (
    <div className="footer-row" key="edit">
      <span className="note">{editNote(mode, plain, keepWhole)}</span>
      <span className="spacer" />
      <Button variant="ghost" onClick={onCancel}>
        {t("Cancel")}
      </Button>
      <Button variant="primary" icon={Scissors} onClick={onSave} disabled={!canSave}>
        {!plain ? tn("Save clip", "Save {n} clips", count) : mode === "edit" ? t("Trim & replace") : t("Trim")}
      </Button>
    </div>
  );
}

function editNote(mode: TrimMode, plain: boolean, keepWhole: boolean): string {
  if (mode === "export") return t("The folder stays as it is — the trim is applied when you export the result.");
  if (plain)
    return mode === "files"
      ? t("The cut is lossless. Your library keeps the original until you delete it in Photos.")
      : t("The cut-away part leaves the folder. The original waits {days} days in Recently deleted.", { days: KEEP_DAYS });
  return keepWhole
    ? t("Each clip becomes a video of its own, at its own time. The whole video stays.")
    : t("Each clip becomes a video of its own, at its own time. The whole video is rated Delete.");
}
