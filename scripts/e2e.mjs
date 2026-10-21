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

import { installFixtures } from "./fixtures.mjs";

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
mkdirSync("tmp/e2e", { recursive: true });

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
let page;
const fail = async (msg) => {
  console.error(`✗ ${msg}`);
  await page?.screenshot({ path: "tmp/e2e/failure.png" }).catch(() => {});
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
page = await context.newPage();
page.on("pageerror", (e) => fail(`page error: ${e.message}`));

await context.addInitScript(installFixtures);
await context.addInitScript(() => {
  window.showDirectoryPicker = async ({ id } = {}) => {
    const root = await navigator.storage.getDirectory();
    const name = { "reel-export": "Exports", "reel-picks": "Picks" }[id] ?? "Trip";
    return root.getDirectoryHandle(name, { create: true });
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

  const { jpeg } = window.__fixtures;

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
await page.getByRole("button", { name: "Open a folder" }).click();
await page.locator(".card").first().waitFor({ timeout: 15000 });
if ((await page.locator(".card").count()) < 5) await fail("expected the carousel to show several cards");
const counter = () => page.locator(".stage-count").innerText();
if ((await counter()) !== "1 / 10") await fail(`expected 10 items (duplicate merged, txt ignored), got ${await counter()}`);
ok("scan: 10 items, duplicate collapsed, txt ignored");
if ((await page.locator(".card-count").first().innerText()).trim() !== "2") await fail("burst counter should read 2");
await page.keyboard.press("End");
await page.waitForTimeout(400);
if ((await page.locator(".day-sep").count()) < 1) await fail("expected a day separator in the carousel");
await page.keyboard.press("Home");
if ((await page.locator(".wave-label").count()) !== 2) await fail("expected 2 day labels on the waveform");
ok("day separator, waveform with day labels, burst counter");
await page.waitForTimeout(800);
await page.screenshot({ path: "tmp/e2e/1-opened.png" });

// ---- Burst: open it, X rejects all but the best ----------------------------------------
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
if ((await page.locator(".card-count").count()) !== 0) await fail("Enter should open the burst");
await page.keyboard.press("ArrowUp");
await page.keyboard.press("x");
await page.waitForTimeout(300);
if ((await page.locator(".card.rm2").count()) !== 1) await fail("X should mark the other burst member as discard");
await page.keyboard.press("z");
await page.keyboard.press("z");
await page.keyboard.press("Enter");
ok("burst: Enter opens, X rejects the rest, Z undoes");

// ---- Rate --------------------------------------------------------------------
const center = () => page.locator(".card.is-current").boundingBox();
await page.waitForTimeout(500);
const before = await center();
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(500);
const after = await center();
if (!(after.height > before.height * 1.2 && after.y < before.y)) await fail("rating up should make the card bigger and higher");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(500);
const meh = await center();
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(500);
const low = await center();
if (!(meh.height < before.height && low.height < meh.height * 0.7 && low.y + low.height > meh.y + meh.height)) {
  await fail("each step down should shrink the card and let it sink");
}
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowUp");
await page.keyboard.press("z");
await page.waitForTimeout(400);
if ((await page.locator(".card.r2").count()) !== 1) await fail("expected exactly one favorite card");
if ((await page.locator(".card.rm2").count()) !== 1) await fail("expected exactly one discard card");
if ((await page.locator(".card.r1").count()) !== 0) await fail("undo did not revert the last rating");
ok("five levels: ↑/↓ grow+lift / shrink+sink cards, Z undoes");
await page.screenshot({ path: "tmp/e2e/2-rated.png" });

// ---- Tags ------------------------------------------------------------------------
await page.keyboard.press("Home");
await page.keyboard.press("1");
await page.keyboard.press("t");
await page.keyboard.type("Tram");
await page.keyboard.press("Enter");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const chips = await page.locator(".dock .tag > span").allInnerTexts();
if (chips.join(",") !== "Food,Tram") await fail(`tag chips in the dock: ${chips}`);
if ((await page.locator(".card.is-current .card-tags .tag-dot").count()) !== 2) await fail("tag dots under the favorite");
ok("tags: preset key 1 + free tag via T, chips in the dock, dots under liked cards");

// ---- Picks (Space) -------------------------------------------------------------------
await page.keyboard.press(" ");
await page.getByText(/Copied to Picks/).waitFor({ timeout: 5000 });
const picks = async () =>
  page.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle("Picks");
    const out = [];
    for await (const n of dir.keys()) out.push(n);
    return out;
  });
if ((await picks()).join() !== "IMG_1000.JPG") await fail(`picks folder: ${await picks()}`);
if ((await page.locator(".card.is-current .badge.is-pick").count()) !== 1) await fail("picked card should show the pick badge");
if (!(await page.getByRole("button", { name: /Picked/ }).count())) await fail("dock should say Picked");
await page.keyboard.press(" ");
await page.getByText(/Removed from Picks/).waitFor({ timeout: 5000 });
if ((await picks()).length !== 0) await fail("second Space should take the copy back");
await page.keyboard.press(" ");
await page.getByText(/Copied to Picks/).waitFor({ timeout: 5000 });
ok("Space copies into the picks folder, again takes it back");

// ---- Waveform jump ----------------------------------------------------------------------
const wave = await page.locator(".wave").boundingBox();
await page.mouse.click(wave.x + wave.width - 3, wave.y + wave.height / 2);
await page.waitForTimeout(300);
if ((await counter()) !== "10 / 10") await fail("clicking the waveform's right end should jump to the last item");
await page.keyboard.press("Home");
ok("waveform click jumps in time");

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
if (JSON.stringify(ratings) !== JSON.stringify([-2, 0, 0, 0, 0, 0, 0, 0, 0, 2])) await fail(`saved ratings ${ratings}`);
if (saved.version !== 2) await fail("expected .reel.json version 2");
if (!Object.values(saved.media).some((m) => m.stackId)) await fail("burst stackId not saved");
if (!Object.values(saved.media).some((m) => m.place === "Porto")) await fail("place not saved");
if (!Object.values(saved.media).some((m) => m.altPaths?.length)) await fail("duplicate not recorded in altPaths");
if (!Object.values(saved.media).every((m) => m.takenAt.startsWith("2026-10-1"))) await fail("EXIF dates not read");
ok(".reel.json saved (ratings, place, altPaths, EXIF dates)");

// ---- Filter -------------------------------------------------------------------
await page.getByRole("radio", { name: "Favorites" }).click();
if ((await page.locator(".card.is-dimmed").count()) < 4) await fail("Top filter should dim the other cards");
await page.getByRole("radio", { name: "All" }).click();
ok("filter dims instead of hiding");

// ---- Series --------------------------------------------------------------------
await page.keyboard.press("Home");
for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowRight");
await page.keyboard.press("s");
const title = await page.getByLabel("Series title").inputValue();
if (!title.startsWith("Porto")) await fail(`title suggestion "${title}" should start with the place`);
ok(`title suggestion: "${title}"`);
await page.getByRole("button", { name: "Roll a funny title" }).click();
ok(`dice: "${await page.getByLabel("Series title").inputValue()}"`);
await page.screenshot({ path: "tmp/e2e/3-series.png" });
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
if ((await page.locator(".badge.is-done").count()) < 3) await fail("exported items should show the check badge");
ok("exported items show the check badge");
await page.keyboard.press("Escape");
await page.screenshot({ path: "tmp/e2e/4-after-export.png" });

// ---- Clean up: discards → _reel_trash ------------------------------------------------
await page.getByRole("button", { name: /^Discards/ }).click();
await page.getByRole("button", { name: "Move to trash folder…" }).click();
await page.getByRole("button", { name: /^Move \d+ files/ }).click();
await page.getByText(/moved to _reel_trash/).waitFor({ timeout: 5000 });
const trashed = await page.evaluate(async () => {
  const trip = await (await navigator.storage.getDirectory()).getDirectoryHandle("Trip");
  const t = await (await (await trip.getDirectoryHandle("_reel_trash")).getDirectoryHandle("Porto")).getDirectoryHandle("100APPLE");
  const out = [];
  for await (const n of t.keys()) out.push(n);
  return out;
});
if (trashed.length !== 1) await fail(`expected one file in _reel_trash, got ${trashed}`);
if ((await page.locator(".card.rm2").count()) !== 0) await fail("trashed item should leave the carousel");
ok(`clean up: ${trashed[0]} moved into _reel_trash/, nothing deleted`);

// ---- Re-open: remembered handle, state restored --------------------------------
await page.waitForTimeout(800);
await page.reload();
await page.getByRole("button", { name: /Continue with/ }).click();
await page.locator(".card").first().waitFor();
if ((await page.locator(".card.r2").count()) !== 1) await fail("rating lost after re-open");
if ((await page.locator(".badge.is-done").count()) < 3) await fail("exports lost after re-open");
if ((await page.locator(".badge.is-pick").count()) !== 1) await fail("pick lost after re-open");
ok("re-open via remembered folder restores everything");

// ---- Help overlay + light theme ---------------------------------------------------
await page.keyboard.press("?");
await page.getByRole("heading", { name: "Keyboard shortcuts" }).waitFor();
await page.screenshot({ path: "tmp/e2e/4-help.png" });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Light theme" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "tmp/e2e/5-light.png" });
ok("help overlay and light theme");

await browser.close();
server.kill();
console.log("\n✓ e2e passed — screenshots in tmp/e2e/");
