import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { shareFiles } from "@/fs/share";
import { t, tn } from "@/i18n";
import { saveClips } from "@/store/clips";
import { saveTrim } from "@/store/trim";
import { useReel } from "@/store/useReel";
import { showToast, useUi } from "@/store/useUi";
import { KEEP_DAYS, type Media } from "@/types";
import { Button } from "@/ui/kit/Button";
import { Dialog } from "@/ui/kit/Dialog";

import { ClipBar, TrimFooter, type Phase, type TrimMode } from "./ClipBar";
import { keptSeconds } from "./clips";
import { MIN_LENGTH, TrimTrack, formatTime } from "./TrimTrack";
import { usePreview } from "./usePreview";

/**
 * Trim the current video — keep one part, or pull several clips out of it
 * (UC-002, UC-007).
 */
export function TrimDialog() {
  const open = useUi((s) => s.dialog === "trim");
  const media = useReel((s) => (s.currentId ? s.reel.media[s.currentId] : undefined));
  if (!open || !media) return null;
  // Not keyed by id: saving makes the trimmed copy current, and the dialog must stay on its share step.
  return <Trim media={media} onDone={() => useUi.getState().set({ dialog: null })} />;
}

function Trim({ media: current, onDone }: { media: Media; onDone(): void }) {
  // The video this dialog was opened for, fixed for its lifetime.
  const [media] = useState(current);
  const files = useUi((s) => s.sourceKind === "files");
  const exporting = useReel((s) => s.reel.workflow === "export");
  const mode: TrimMode = files ? "files" : exporting ? "export" : "edit";
  const [phase, setPhase] = useState<Phase>({ kind: "edit" });
  const [keepWhole, setKeepWhole] = useState(false);
  const p = usePreview(media);
  const { clips, duration, range } = p;
  // One clip and the whole video not kept is the plain trim: it replaces the original.
  const plain = mode === "export" || (clips.length === 1 && !keepWhole);

  const save = async () => {
    p.pause();
    setPhase({ kind: "saving", progress: 0 });
    const onProgress = (progress: number) => setPhase({ kind: "saving", progress });
    try {
      if (plain) {
        const out = await saveTrim(media, range, onProgress);
        if (out.kind === "share") return setPhase({ kind: "share", files: [out.file] });
        showToast(
          out.kind === "replaced"
            ? t("Trimmed — the original is in Recently deleted for {days} days", { days: KEEP_DAYS })
            : t("Trim saved — it is applied when you export the result"),
        );
        return onDone();
      }
      const out = await saveClips(media, clips, keepWhole, onProgress);
      if (out.kind === "share") return setPhase({ kind: "share", files: out.files });
      showToast(tn("1 clip saved next to the original", "{n} clips saved next to the original", out.count));
      onDone();
    } catch (err) {
      console.error(err);
      showToast(t("Trimming failed: {error}", { error: err instanceof Error ? err.message : String(err) }), "error");
      setPhase({ kind: "edit" });
    }
  };

  const share = async (list: File[]) => {
    // A tap of its own: Safari only opens the share sheet straight from a gesture.
    try {
      await shareFiles(list, list[0]!.name);
      onDone();
    } catch (err) {
      showToast(t("Sharing failed: {error}", { error: err instanceof Error ? err.message : String(err) }), "error");
    }
  };

  const unchanged = plain && range.start < 0.05 && duration - range.end < 0.05;
  const valid = clips.length > 0 && clips.every((c) => c.end - c.start >= MIN_LENGTH);
  const kept = formatTime(keptSeconds(clips));
  const whole = formatTime(duration);

  return (
    <Dialog
      open
      onClose={phase.kind === "saving" ? () => {} : onDone}
      title={t("Trim video")}
      subtitle={
        !duration
          ? undefined
          : clips.length > 1
            ? t("{n} clips, {part} of {whole}", { n: clips.length, part: kept, whole })
            : t("Keep {part} of {whole}", { part: kept, whole })
      }
      wide
      footer={
        <TrimFooter
          phase={phase}
          mode={mode}
          plain={plain}
          count={clips.length}
          keepWhole={keepWhole}
          canSave={duration > 0 && valid && !unchanged}
          onCancel={onDone}
          onSave={() => void save()}
          onShare={(list) => void share(list)}
        />
      }
    >
      <div className="trim-stage">{p.url && <video className="trim-video" {...p.videoProps} />}</div>
      <div className="trim-controls">
        <Button
          icon={p.playing ? Pause : Play}
          label={p.playing ? t("Pause") : clips.length > 1 ? t("Play this clip") : t("Play the kept part")}
          variant="secondary"
          onClick={p.togglePlay}
          disabled={!duration || phase.kind !== "edit"}
        />
        {p.url && duration > 0 && (
          <TrimTrack
            url={p.url}
            duration={duration}
            clips={clips}
            active={p.active}
            playhead={p.playhead}
            onChange={p.changeRange}
            onSeek={p.seek}
            onSelect={p.selectClip}
          />
        )}
      </div>
      <div className="trim-times tabular">
        <span>{formatTime(range.start)}</span>
        <span>{formatTime(range.end)}</span>
      </div>
      {mode !== "export" && duration > 0 && phase.kind === "edit" && (
        <ClipBar
          clips={clips}
          active={p.active}
          keepWhole={keepWhole}
          onSelect={p.selectClip}
          onRemove={p.removeClip}
          onAdd={p.addClip}
          onKeepWhole={setKeepWhole}
        />
      )}
    </Dialog>
  );
}
