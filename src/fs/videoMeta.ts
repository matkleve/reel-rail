/**
 * Minimal QuickTime/MP4 metadata sniffing — no library, no extra read.
 *
 * exifr does not read MOV/MP4. The two facts we need sit in small atoms of the
 * `moov` box, which a camera writes at the start or the end of the file — both
 * of which the hasher already holds in memory.
 */

// Seconds between 1904-01-01 (QuickTime epoch) and 1970-01-01.
const QT_EPOCH_OFFSET = 2082844800;

function find(bytes: Uint8Array, tag: number[], from = 0): number {
  outer: for (let i = from; i <= bytes.length - tag.length; i++) {
    for (let j = 0; j < tag.length; j++) if (bytes[i + j] !== tag[j]) continue outer;
    return i;
  }
  return -1;
}

const MVHD = [0x6d, 0x76, 0x68, 0x64]; // "mvhd"
const XYZ = [0xa9, 0x78, 0x79, 0x7a]; // "©xyz"

/** Creation time from the `mvhd` atom, or undefined if absent or implausible. */
export function videoCreationTime(buf: ArrayBuffer): Date | undefined {
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  let at = find(bytes, MVHD);
  while (at >= 0) {
    const version = bytes[at + 4];
    const p = at + 8;
    let secs: number | undefined;
    if (version === 0 && p + 4 <= bytes.length) secs = view.getUint32(p);
    if (version === 1 && p + 8 <= bytes.length) secs = Number(view.getBigUint64(p));
    if (secs !== undefined) {
      const date = new Date((secs - QT_EPOCH_OFFSET) * 1000);
      // Many cameras write 0 (= 1904) when the clock was never set.
      const year = date.getUTCFullYear();
      if (year >= 2000 && date.getTime() <= Date.now() + 365 * 864e5) return date;
    }
    at = find(bytes, MVHD, at + 4);
  }
  return undefined;
}

/** GPS from Apple's `©xyz` atom, e.g. "+41.1496-008.6110+085.000/". */
export function videoGps(buf: ArrayBuffer): { lat: number; lng: number } | undefined {
  const bytes = new Uint8Array(buf);
  const at = find(bytes, XYZ);
  if (at < 0) return undefined;
  const text = new TextDecoder("latin1").decode(bytes.subarray(at + 4, at + 64));
  const m = /([+-]\d{1,2}\.\d+)([+-]\d{1,3}\.\d+)/.exec(text);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
}
