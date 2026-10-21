import exifr from "exifr";

import type { Media } from "@/types";

import { getMediaFile } from "./session";

/**
 * Lazy thumbnails, ~320px, cached in memory as object URLs.
 *
 * Requests are served newest-first (a stack, not a queue): while the user
 * scrolls the timeline, what is on screen now matters more than what was on
 * screen a second ago.
 */

// Larger than a classic 320 px thumb: side cards in the carousel are big.
const SIZE = 480;
const MAX_PARALLEL = 3;

/** `aspect` = width / height, known once the thumbnail exists — the carousel sizes cards by it. */
export type Thumb = { url?: string; aspect?: number; failed?: boolean };
type Entry = Thumb;
const cache = new Map<string, Entry>();
const pending: Pick<Media, "id" | "path" | "type" | "binned">[] = [];
const listeners = new Set<() => void>();
let running = 0;
let version = 0;

/** Bumps whenever any thumbnail lands — for views that lay out by aspect ratio. */
export function thumbsVersion(): number {
  return version;
}

export function subscribeThumbs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function thumbFor(id: string): Entry | undefined {
  return cache.get(id);
}

export function requestThumb(media: Pick<Media, "id" | "path" | "type" | "binned">): void {
  if (cache.has(media.id) || pending.some((m) => m.id === media.id)) return;
  pending.push(media);
  pump();
}

/** Drops queued work for items that scrolled out of view. */
export function cancelThumb(id: string): void {
  const i = pending.findIndex((m) => m.id === id);
  if (i >= 0) pending.splice(i, 1);
}

function pump(): void {
  while (running < MAX_PARALLEL && pending.length) {
    const media = pending.pop()!;
    running++;
    make(media)
      .then((thumb) => cache.set(media.id, thumb))
      .catch(() => cache.set(media.id, { failed: true }))
      .finally(() => {
        running--;
        version++;
        listeners.forEach((fn) => fn());
        pump();
      });
  }
}

async function make(media: Pick<Media, "id" | "path" | "type" | "binned">): Promise<Thumb> {
  const file = await getMediaFile(media);
  const source = media.type === "video" ? await videoFrame(file) : await imageSource(file);
  const { blob, aspect } = await draw(source);
  if ("close" in source) source.close();
  return { url: URL.createObjectURL(blob), aspect };
}

async function imageSource(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { resizeWidth: SIZE, resizeQuality: "medium" });
  } catch {
    // Safari rejects the resize options on some versions — decode at full size, draw() scales.
  }
  try {
    return await createImageBitmap(file);
  } catch {
    // Chrome cannot decode HEIC — but iPhones embed a JPEG preview in it.
    const jpeg = await exifr.thumbnail(file);
    if (!jpeg) throw new Error("undecodable");
    return createImageBitmap(new Blob([jpeg as BlobPart], { type: "image/jpeg" }));
  }
}

function videoFrame(file: File): Promise<HTMLVideoElement & { close(): void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = () => URL.revokeObjectURL(url);
    v.muted = true;
    v.preload = "auto";
    // iOS only decodes inline video with playsinline; without it the seek never lands.
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.onloadedmetadata = () => (v.currentTime = Math.min(0.5, (v.duration || 1) / 2));
    v.onseeked = () => resolve(Object.assign(v, { close: done }));
    v.onerror = () => {
      done();
      reject(new Error("video decode failed"));
    };
    v.src = url;
  });
}

function draw(src: ImageBitmap | HTMLVideoElement): Promise<{ blob: Blob; aspect: number }> {
  const w = "videoWidth" in src ? src.videoWidth : src.width;
  const h = "videoHeight" in src ? src.videoHeight : src.height;
  const scale = Math.min(1, SIZE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d")!.drawImage(src, 0, 0, canvas.width, canvas.height);
  const aspect = canvas.width / canvas.height;
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, aspect }) : reject(new Error("toBlob"))), "image/jpeg", 0.82),
  );
}
