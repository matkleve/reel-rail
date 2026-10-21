import { videoCreationTime } from "./videoMeta";

/**
 * Lossless video trimming with mediabunny (loaded on demand — it is only
 * needed once someone trims).
 *
 * Why a library: the platform has no MP4/MOV muxer. MediaRecorder re-encodes
 * in real time and loses quality; WebCodecs encodes but does not write files.
 * mediabunny cuts by copying the compressed samples ("packet copy"), so it is
 * fast, needs no decoder (HEVC from an iPhone works anywhere) and the picture
 * is bit-identical. The cut starts at the key frame at or before `start` —
 * at most a second earlier on a phone video, never later.
 */

export const TRIMMABLE = /\.(mov|mp4|m4v)$/i;

// Seconds between 1904-01-01 (QuickTime epoch) and 1970-01-01.
const QT_EPOCH_OFFSET = 2082844800;

/**
 * mediabunny stamps the output's `mvhd` with "now". The creation time is
 * what reel-rail (and Photos) read as "taken at", so it is written back:
 * the original's time plus the trimmed-away start. Patched in place in the
 * bytes of the moov box; returns whether it found one.
 */
export function patchCreationTime(bytes: Uint8Array, when: Date): boolean {
  const secs = Math.floor(when.getTime() / 1000) + QT_EPOCH_OFFSET;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 4; i + 8 < bytes.length; i++) {
    // "mvhd", preceded by a plausible box size (version 0: 108, version 1: 120).
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue;
    const size = view.getUint32(i - 4);
    const version = bytes[i + 4];
    if (version === 0 && size === 108 && i + 16 <= bytes.length) {
      view.setUint32(i + 8, secs); // creation
      view.setUint32(i + 12, secs); // modification
      return true;
    }
    if (version === 1 && size === 120 && i + 24 <= bytes.length) {
      view.setBigUint64(i + 8, BigInt(secs));
      view.setBigUint64(i + 16, BigInt(secs));
      return true;
    }
  }
  return false;
}

export type TrimRange = { start: number; end: number };
type Progress = (fraction: number) => void;

/** When the trimmed video was "taken": the original's time + the cut-away start. */
export async function trimmedTakenAt(file: Blob, takenAt: string, start: number): Promise<Date> {
  const MB = 1024 * 1024;
  const head = await file.slice(0, MB).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - MB)).arrayBuffer();
  const original = videoCreationTime(head) ?? videoCreationTime(tail) ?? new Date(takenAt);
  return new Date(original.getTime() + Math.floor(start) * 1000);
}

async function convert(file: Blob, range: TrimRange, target: "buffer" | WritableStream, onProgress?: Progress) {
  const mb = await import("mediabunny");
  const input = new mb.Input({
    source: new mb.BlobSource(file),
    formats: mb.ALL_FORMATS,
  });
  const isMov = (await input.getFormat()) instanceof mb.QuickTimeInputFormat;
  const output = new mb.Output({
    format: isMov ? new mb.MovOutputFormat() : new mb.Mp4OutputFormat(),
    target: target === "buffer" ? new mb.BufferTarget() : new mb.StreamTarget(target as WritableStream),
  });
  const conversion = await mb.Conversion.init({
    input,
    output,
    trim: range,
    // Copy only: a re-encode would be slow on a phone and lose quality.
    copy: { mode: "forced", boundaryPolicy: "expand" },
    showWarnings: false,
  });
  if (!conversion.isValid || !conversion.utilizedTracks.some((t) => t.type === "video"))
    throw new Error("This video can’t be trimmed without re-encoding it.");
  // A trimmed file replaces the original: it must not quietly lose a sound or picture track
  // (spatial audio, a second camera layer) that could not be copied.
  const lost = conversion.discardedTracks.filter((d) => d.track.type === "video" || d.track.type === "audio");
  if (lost.length) throw new Error(`This video has a ${lost[0]!.track.type} track reel-rail can’t keep when trimming.`);
  if (onProgress) conversion.onProgress = (p) => onProgress(p);
  await conversion.execute();
  return output.target instanceof mb.BufferTarget ? output.target.buffer : null;
}

/** Trims into memory (files mode: the result is shared). */
export async function trimToBlob(file: File, range: TrimRange, takenAt: Date, onProgress?: Progress): Promise<Blob> {
  const buffer = await convert(file, range, "buffer", onProgress);
  if (!buffer) throw new Error("Trimming produced no data");
  const bytes = new Uint8Array(buffer);
  patchCreationTime(bytes, takenAt);
  return new Blob([bytes], { type: file.type || "video/quicktime" });
}

/**
 * Trims straight into a file on disk (folder mode), without holding the
 * video in memory. Every chunk passes through here so the creation time can
 * be patched in the moov box when it goes by.
 */
export async function trimToWritable(
  file: File,
  range: TrimRange,
  takenAt: Date,
  sink: FileSystemWritableFileStream,
  onProgress?: Progress,
): Promise<void> {
  let patched = false;
  const through = new WritableStream<{
    type: "write";
    data: Uint8Array;
    position: number;
  }>({
    async write(chunk) {
      if (!patched) patched = patchCreationTime(chunk.data, takenAt);
      await sink.write({
        type: "write",
        data: chunk.data as Uint8Array<ArrayBuffer>,
        position: chunk.position,
      });
    },
    close: () => sink.close(),
    abort: (reason) => sink.abort(reason),
  });
  await convert(file, range, through, onProgress);
}
