const CHUNK = 1024 * 1024;

/**
 * Content id: SHA-256 over (first 1 MB + last 1 MB + size).
 *
 * Hashing whole files would make a 4 GB video take seconds; head + tail + size
 * still tells renamed files and real duplicates apart in practice, because
 * every camera writes distinct headers and trailers.
 *
 * Also returns the two slices so callers can sniff metadata (video creation
 * time lives in the `moov` box, at either end of the file) without a second read.
 */
export async function hashFile(file: Blob): Promise<{ id: string; head: ArrayBuffer; tail: ArrayBuffer }> {
  const head = await file.slice(0, CHUNK).arrayBuffer();
  const tail =
    file.size > CHUNK ? await file.slice(Math.max(CHUNK, file.size - CHUNK)).arrayBuffer() : new ArrayBuffer(0);
  const sizeBytes = new TextEncoder().encode(String(file.size));

  const all = new Uint8Array(head.byteLength + tail.byteLength + sizeBytes.byteLength);
  all.set(new Uint8Array(head), 0);
  all.set(new Uint8Array(tail), head.byteLength);
  all.set(sizeBytes, head.byteLength + tail.byteLength);

  const digest = await crypto.subtle.digest("SHA-256", all);
  return { id: toHex(digest), head, tail };
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
