import { Pause, Play, Scissors, Share } from "lucide-react";
import { useState } from "react";

import { canShareFiles, shareFiles } from "@/fs/share";
import { saveTrim } from "@/store/trim";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { KEEP_DAYS, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

import { MIN_LENGTH, TrimTrack, formatTime } from "./TrimTrack";
import { usePreview } from "./usePreview";

/** Trim the current video: keep the part between the handles, the rest goes. */
export function TrimDialog() {
  const open = useUi((s) => s.dialog === "trim");
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  if (!open || !media) return null;
  // Not keyed by id: saving makes the trimmed copy current, and the dialog must stay on its share step.
  return <Trim media={media} onDone={() => useUi.getState().set({ dialog: null })} />;
}

type Phase = { kind: "edit" } | { kind: "saving"; progress: number } | { kind: "share"; file: File };

function Trim({ media: current, onDone }: { media: Media; onDone(): void }) {
  // The video this dialog was opened for, fixed for its lifetime.
  const [media] = useState(current);
  const files = useUi((s) => s.sourceKind === "files");
  const exporting = useReel((s) => s.reel.workflow === "export");
  const mode = files ? "files" : exporting ? "export" : "edit";
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });
  const { url, duration, range, playhead, playing, seek, togglePlay, changeRange, videoProps, pause } =
    usePreview(media);

  const save = async () => {
    pause();
    setPhase({ kind: "saving", progress: 0 });
    try {
      const out = await saveTrim(media, range, (progress) => setPhase({ kind: "saving", progress }));
      if (out.kind === "share") return setPhase({ kind: "share", file: out.file });
      showToast(
        out.kind === "replaced"
          ? `Trimmed — the original is in Recently deleted for ${KEEP_DAYS} days`
          : "Trim saved — it is applied when you export the result",
      );
      onDone();
    } catch (err) {
      console.error(err);
      showToast(`Trimming failed: ${err instanceof Error ? err.message : err}`, "error");
      setPhase({ kind: "edit" });
    }
  };

  const share = async (file: File) => {
    // A tap of its own: Safari only opens the share sheet straight from a gesture.
    try {
      await shareFiles([file], file.name);
      onDone();
    } catch (err) {
      showToast(`Sharing failed: ${err instanceof Error ? err.message : err}`, "error");
    }
  };

  const length = range.end - range.start;
  const unchanged = range.start < 0.05 && duration - range.end < 0.05;

  return (
    <Dialog
      open
      onClose={phase.kind === "saving" ? () => {} : onDone}
      title="Trim video"
      subtitle={duration ? `Keep ${formatTime(length)} of ${formatTime(duration)}` : undefined}
      wide
      footer={
        <TrimFooter
          phase={phase}
          mode={mode}
          canSave={duration > 0 && !unchanged && length >= MIN_LENGTH}
          onCancel={onDone}
          onSave={() => void save()}
          onShare={(file) => void share(file)}
        />
      }
    >
      <div className="trim-stage">{url && <video className="trim-video" {...videoProps} />}</div>
      <div className="trim-controls">
        <Button
          icon={playing ? Pause : Play}
          label={playing ? "Pause" : "Play the kept part"}
          variant="secondary"
          onClick={togglePlay}
          disabled={!duration || phase.kind !== "edit"}
        />
        {url && duration > 0 && (
          <TrimTrack
            url={url}
            duration={duration}
            start={range.start}
            end={range.end}
            playhead={playhead}
            onChange={changeRange}
            onSeek={seek}
          />
        )}
      </div>
      <div className="trim-times tabular">
        <span>{formatTime(range.start)}</span>
        <span>{formatTime(range.end)}</span>
      </div>
    </Dialog>
  );
}

type FooterProps = {
  phase: Phase;
  mode: "files" | "edit" | "export";
  canSave: boolean;
  onCancel(): void;
  onSave(): void;
  onShare(file: File): void;
};

/** Edit → saving (progress) → share (files mode only). */
function TrimFooter({ phase, mode, canSave, onCancel, onSave, onShare }: FooterProps) {
  if (phase.kind === "share")
    return (
      <div className="footer-row" key="share">
        <span className="note">Trimmed. Save it to Photos, then delete the original there.</span>
        <span className="spacer" />
        <Button variant="primary" icon={Share} onClick={() => onShare(phase.file)} autoFocus>
          {canShareFiles([phase.file]) ? "Save to Photos…" : "Download"}
        </Button>
      </div>
    );
  if (phase.kind === "saving")
    return (
      <div className="footer-row" key="saving">
        <div className="progress trim-progress">
          <div className="progress-bar" style={{ width: `${Math.round(phase.progress * 100)}%` }} />
        </div>
        <span className="text-2 tabular">Trimming… {Math.round(phase.progress * 100)} %</span>
      </div>
    );
  return (
    <div className="footer-row" key="edit">
      <span className="note">
        {mode === "files"
          ? "The cut is lossless. Your library keeps the original until you delete it in Photos."
          : mode === "export"
            ? "The folder stays as it is — the trim is applied when you export the result."
            : `The cut-away part leaves the folder. The original waits ${KEEP_DAYS} days in Recently deleted.`}
      </span>
      <span className="spacer" />
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" icon={Scissors} onClick={onSave} disabled={!canSave}>
        {mode === "edit" ? "Trim & replace" : "Trim"}
      </Button>
    </div>
  );
}
