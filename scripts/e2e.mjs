#!/usr/bin/env node
/**
 * End-to-end smoke test in real Chromium against the production build.
 *
 * The native folder picker cannot be driven by automation, so
 * `showDirectoryPicker` is replaced with folders in the Origin Private File
 * System — same FileSystemDirectoryHandle API, so scan, hash, EXIF, save and
 * export all run for real. Test photos are canvas JPEGs with a hand-written
 * EXIF DateTimeOriginal, spread over two days with a long pause.
 *
 * Screenshots land in tmp/e2e/.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

import { chromium } from "playwright";

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
mkdirSync("tmp/e2e", { recursive: true });

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  server.kill();
  process.exit(1);
};
const ok = (msg) => console.log(`✓ ${msg}`);

for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const page = await context.newPage();
page.on("pageerror", (e) => fail(`page error: ${e.message}`));

await context.addInitScript(() => {
  window.showDirectoryPicker = async ({ id } = {}) => {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(id === "reel-export" ? "Exports" : "Trip", { create: true });
  };
});

await page.goto(URL);

// ---- Seed the fake folder ---------------------------------------------------
await page.evaluate(async () => {
  const root = await navigator.storage.getDirectory();
  for await (const name of root.keys()) await root.removeEntry(name, { recursive: true });
  const trip = await root.getDirectoryHandle("Trip", { create: true });
  const porto = await trip.getDirectoryHandle("Porto", { create: true });
  const dcim = await porto.getDirectoryHandle("100APPLE", { create: true });

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

  async function jpeg(hue, label, date) {
    const c = new OffscreenCanvas(1200, 800);
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, `hsl(${hue} 70% 55%)`);
    grad.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 25%)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1200, 800);
    g.fillStyle = "rgba(255,255,255,.85)";
    g.font = "bold 120px sans-serif";
    g.fillText(label, 80, 460);
    const bytes = new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.8 })).arrayBuffer());
    const app1 = exif(date);
    const out = new Uint8Array(bytes.length + app1.length);
    out.set(bytes.subarray(0, 2));
    out.set(app1, 2);
    out.set(bytes.subarray(2), 2 + app1.length);
    return out;
  }

  async function write(dir, name, data) {
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(data);
    await w.close();
  }

  // Day 1 morning burst, a 5 h pause, an evening; day 2 a few more.
  const shots = [
    ["2026:10:14 09:00:00", 10],
    ["2026:10:14 09:00:02", 30],
    ["2026:10:14 09:12:00", 50],
    ["2026:10:14 09:40:00", 200],
    ["2026:10:14 14:45:00", 220],
    ["2026:10:14 15:10:00", 260],
    ["2026:10:14 19:30:00", 300],
    ["2026:10:15 08:05:00", 120],
    ["2026:10:15 08:30:00", 140],
    ["2026:10:15 11:00:00", 160],
  ];
  for (const [i, [date, hue]] of shots.entries()) {
    await write(dcim, `IMG_${1000 + i}.JPG`, await jpeg(hue, `#${i + 1}`, date));
  }
  // A duplicate under another name, and a non-media file that must be ignored.
  const firstBytes = await (await (await dcim.getFileHandle("IMG_1000.JPG")).getFile()).arrayBuffer();
  await write(porto, "copy-of-first.jpg", firstBytes);
  await write(trip, "notes.txt", "not media");
});
ok("seeded 10 photos + 1 duplicate + 1 non-media file");

// ---- Open & scan ------------------------------------------------------------
await page.reload();
await page.getByRole("button", { name: "Open folder" }).click();
await page.locator(".tl-item").first().waitFor({ timeout: 15000 });
const count = await page.locator(".tl-item").count();
if (count !== 10) fail(`expected 10 items on the rail (duplicate collapsed), got ${count}`);
ok("scan: 10 items, duplicate collapsed, txt ignored");

if ((await page.locator(".tl-day").count()) !== 2) fail("expected 2 day markers");
if ((await page.locator(".tl-gap").count()) < 1) fail("expected a gap marker for the 5 h pause");
ok("day markers and pause gap rendered");
await page.waitForTimeout(800);
await page.screenshot({ path: "tmp/e2e/1-opened.png" });

// ---- Rate --------------------------------------------------------------------
const size = async (i) => (await page.locator(".tl-item").nth(i).boundingBox()).width;
const before = await size(0);
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(400);
if (!((await size(0)) > before + 40)) fail("rating up did not grow the item");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowUp");
await page.keyboard.press("z");
await page.waitForTimeout(400);
if ((await page.locator(".tl-item.r2").count()) !== 1) fail("expected exactly one top item");
if ((await page.locator(".tl-item.rm1").count()) !== 1) fail("expected exactly one unusable item");
if ((await page.locator(".tl-item.r1").count()) !== 0) fail("undo did not revert the last rating");
ok("rating ↑/↓ resizes items, Z undoes");

// ---- Place, then save --------------------------------------------------------
await page.keyboard.press("p");
await page.keyboard.type("Porto");
await page.keyboard.press("Enter");
await page.waitForTimeout(900);
const saved = await page.evaluate(async () => {
  const trip = await (await navigator.storage.getDirectory()).getDirectoryHandle("Trip");
  return JSON.parse(await (await (await trip.getFileHandle(".reel.json")).getFile()).text());
});
const ratings = Object.values(saved.media).map((m) => m.rating).sort();
if (JSON.stringify(ratings) !== JSON.stringify([-1, 0, 0, 0, 0, 0, 0, 0, 0, 2])) fail(`saved ratings ${ratings}`);
if (!Object.values(saved.media).some((m) => m.place === "Porto")) fail("place not saved");
if (!Object.values(saved.media).some((m) => m.altPaths?.length)) fail("duplicate not recorded in altPaths");
if (!Object.values(saved.media).every((m) => m.takenAt.startsWith("2026-10-1"))) fail("EXIF dates not read");
ok(".reel.json saved (ratings, place, altPaths, EXIF dates)");

// ---- Filter -------------------------------------------------------------------
await page.getByRole("radio", { name: "Top" }).click();
if ((await page.locator(".tl-item.is-dimmed").count()) !== 9) fail("Top filter should dim 9 items");
await page.getByRole("radio", { name: "All" }).click();
ok("filter dims instead of hiding");

// ---- Series --------------------------------------------------------------------
await page.keyboard.press("Home");
for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowRight");
await page.keyboard.press("s");
const title = await page.getByLabel("Series title").inputValue();
if (!title.startsWith("Porto")) fail(`title suggestion "${title}" should start with the place`);
ok(`title suggestion: "${title}"`);
await page.getByRole("button", { name: "Roll a funny title" }).click();
ok(`dice: "${await page.getByLabel("Series title").inputValue()}"`);
await page.screenshot({ path: "tmp/e2e/2-series.png" });
await page.getByRole("button", { name: "Create & export…" }).click();
await page.getByText("Exported to").waitFor({ timeout: 10000 });
const exported = await page.evaluate(async () => {
  const ex = await (await navigator.storage.getDirectory()).getDirectoryHandle("Exports");
  const out = {};
  for await (const [name, h] of ex.entries()) {
    out[name] = [];
    for await (const f of h.keys()) out[name].push(f);
  }
  return out;
});
const files = Object.values(exported)[0]?.sort() ?? [];
if (files.length !== 4 || !files[0].startsWith("01_") || !files[3].startsWith("04_")) {
  fail(`export folder contents: ${JSON.stringify(exported)}`);
}
ok(`export: ${Object.keys(exported)[0]}/ → ${files.join(", ")}`);
await page.getByRole("button", { name: "Done" }).click();
await page.waitForTimeout(400);
// 4 exported, but the unusable one is 16 px and deliberately carries no dot.
if ((await page.locator(".tl-exported").count()) !== 3) fail("exported items should show the check dot");
ok("exported items show the check dot");
await page.keyboard.press("Escape");
await page.screenshot({ path: "tmp/e2e/3-after-export.png" });

// ---- Re-open: remembered handle, state restored --------------------------------
await page.waitForTimeout(800);
await page.reload();
await page.getByRole("button", { name: /Continue with/ }).click();
await page.locator(".tl-item").first().waitFor();
if ((await page.locator(".tl-item.r2").count()) !== 1) fail("rating lost after re-open");
if ((await page.locator(".tl-exported").count()) !== 3) fail("exports lost after re-open");
ok("re-open via remembered folder restores everything");

// ---- Help overlay + light theme ---------------------------------------------------
await page.keyboard.press("?");
await page.getByRole("heading", { name: "Keyboard shortcuts" }).waitFor();
await page.screenshot({ path: "tmp/e2e/4-help.png" });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Toggle light/dark theme" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "tmp/e2e/5-light.png" });
ok("help overlay and light theme");

await browser.close();
server.kill();
console.log("\n✓ e2e passed — screenshots in tmp/e2e/");
