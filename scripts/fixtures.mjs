/**
 * Test photos for the e2e scripts, made in the browser: canvas JPEGs with a
 * hand-written EXIF DateTimeOriginal. Installed with page.addInitScript(),
 * then available as window.__fixtures.jpeg(hue, label, "YYYY:MM:DD hh:mm:ss", w?, h?).
 */
export function installFixtures() {
  function exif(date) {
    const tiff = new Uint8Array(64);
    const v = new DataView(tiff.buffer);
    tiff.set([0x4d, 0x4d, 0, 42]); // "MM", 42
    v.setUint32(4, 8);
    v.setUint16(8, 1); // IFD0: 1 entry
    v.setUint16(10, 0x8769); // ExifIFD pointer
    v.setUint16(12, 4);
    v.setUint32(14, 1);
    v.setUint32(18, 26);
    v.setUint16(26, 1); // Exif IFD: 1 entry
    v.setUint16(28, 0x9003); // DateTimeOriginal
    v.setUint16(30, 2);
    v.setUint32(32, 20);
    v.setUint32(36, 44);
    tiff.set(new TextEncoder().encode(date + "\0"), 44);
    const head = new TextEncoder().encode("Exif\0\0");
    const seg = new Uint8Array(4 + head.length + tiff.length);
    seg.set([0xff, 0xe1, (seg.length - 2) >> 8, (seg.length - 2) & 0xff]);
    seg.set(head, 4);
    seg.set(tiff, 4 + head.length);
    return seg;
  }

  async function jpeg(hue, label, date, w = 1200, h = 800) {
    const c = new OffscreenCanvas(w, h);
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${hue} 70% 55%)`);
    grad.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 25%)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.85)";
    g.font = "bold 120px sans-serif";
    g.fillText(label, 80, h / 2 + 60);
    const bytes = new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.8 })).arrayBuffer());
    const app1 = exif(date);
    const out = new Uint8Array(bytes.length + app1.length);
    out.set(bytes.subarray(0, 2));
    out.set(app1, 2);
    out.set(bytes.subarray(2), 2 + app1.length);
    return out;
  }

  window.__fixtures = { exif, jpeg };
}
