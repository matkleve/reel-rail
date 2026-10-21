#!/usr/bin/env node
/**
 * iPad mode, end to end, in Chromium with iPad-sized touch viewports.
 *
 * WebKit is not available here, so this emulates what matters about an iPad:
 * no folder access (showDirectoryPicker removed → files mode), coarse pointer,
 * touch, 1180×820 and 820×1180, and a share sheet (navigator.share mocked to
 * record what would be shared). Photos go in through the real file input.
 *
 * Swipes are mouse drags: the gesture code reads pointer events of any type.
 * Screenshots land in tmp/e2e-ipad/.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

import { chromium } from "playwright";

import { installFixtures } from "./fixtures.mjs";

const PORT = 4183;
const URL = `http://localhost:${PORT}/`;
const OUT = "tmp/e2e-ipad";
mkdirSync(OUT, { recursive: true });

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
let page;
const fail = async (msg) => {
  console.error(`✗ ${msg}`);
  await page?.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
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
const context = await browser.newContext({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
await context.addInitScript(installFixtures);
await context.addInitScript(() => {
  // What Safari on an iPad looks like to the app.
  delete window.showDirectoryPicker;
  window.__shared = [];
  navigator.canShare = () => true;
  navigator.share = async ({ files, title }) => {
    window.__shared.push({ title, names: files.map((f) => f.name) });
  };
});
page = await context.newPage();
page.on("pageerror", (e) => fail(`page error: ${e.message}`));

await page.goto(URL);

// ---- Photos, as the iPad picker would hand them over ------------------------------
const shots = [
  ["IMG_2001.jpeg", "2026:10:14 09:00:00", 20],
  ["IMG_2002.jpeg", "2026:10:14 09:20:00", 60],
  ["IMG_2003.jpeg", "2026:10:14 10:05:00", 120],
  ["image.jpg", "2026:10:14 12:30:00", 180],
  ["image.jpg", "2026:10:14 15:00:00", 220], // iOS: same name, different photo
  ["IMG_2006.jpeg", "2026:10:15 08:10:00", 260],
  ["IMG_2007.jpeg", "2026:10:15 09:00:00", 300],
  ["IMG_2008.jpeg", "2026:10:15 11:45:00", 340],
];
const bytes = await page.evaluate(async (list) => {
  const out = [];
  for (const [, date, hue] of list) {
    const b = await window.__fixtures.jpeg(hue, date.slice(11, 16), date);
    let s = "";
    for (const x of b) s += String.fromCharCode(x);
    out.push(btoa(s));
  }
  return out;
}, shots);
const files = shots.map(([name], i) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from(bytes[i], "base64") }));

// ---- Start screen in files mode --------------------------------------------------------
if (await page.getByRole("button", { name: "Open a folder" }).count()) await fail("folder button on an iPad");
const add = page.getByRole("button", { name: "Add photos & videos" });
if (!(await add.count())) await fail("no 'Add photos & videos' on the start screen");
if (await page.getByRole("button", { name: "Add a whole folder" }).count()) await fail("folder pick offered on touch");
await page.screenshot({ path: `${OUT}/1-start.png` });
ok("start screen: files mode, photos button, no folder options on touch");

await page.locator('input[type="file"][accept]').first().setInputFiles(files);
await page.locator(".card").first().waitFor({ timeout: 15000 });
const counter = () => page.locator(".stage-count").innerText();
if ((await counter()) !== "1 / 8") await fail(`expected 8 items (two different image.jpg), got ${await counter()}`);
ok("8 photos added through the picker, duplicate names kept apart");
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/2-landscape.png` });

// ---- Gestures ---------------------------------------------------------------------------
async function swipe(dx, dy, hold = 350) {
  const box = await page.locator(".stage").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.waitForTimeout(hold);
  return async () => {
    await page.mouse.up();
    await page.waitForTimeout(450);
  };
}

await (await swipe(-200, 0))();
if ((await counter()) !== "2 / 8") await fail(`swipe left should go to the next item, at ${await counter()}`);
await (await swipe(200, 0))();
if ((await counter()) !== "1 / 8") await fail("swipe right should go back");
ok("swipe left / right browses");

const release = await swipe(0, -140);
const preview = await page.locator(".rate-preview").innerText().catch(() => "");
await page.screenshot({ path: `${OUT}/3-swipe-up.png` });
await release();
if (!preview.includes("Good")) await fail(`rating preview while swiping up should say Good, got "${preview}"`);
if (!(await page.locator(".card.is-current.r1").count())) await fail("swipe up should rate the photo Good");
await (await swipe(0, 140))();
await (await swipe(0, 140))();
if (!(await page.locator(".card.is-current.rm1").count())) await fail("two swipes down from Good should land on Not great");
await (await swipe(0, -140))();
await (await swipe(0, -140))();
ok("swipe up / down rates, with a live preview of the level");

// ---- Tap targets and the dock ------------------------------------------------------------
const rate = await page.locator(".rate-btn").first().boundingBox();
if (rate.width < 44 || rate.height < 44) await fail(`rating buttons should be ≥ 44 px on touch, are ${rate.width}`);
await page.getByRole("radio", { name: "Favorite", exact: true }).tap();
if (!(await page.locator(".card.is-current.r2").count())) await fail("tapping Favorite should set it");
ok("dock buttons are ≥ 44 px and work by tap");

// ---- Pick + share ---------------------------------------------------------------------------
await page.getByRole("button", { name: /^Pick/ }).tap();
await page.locator(".card.is-current .badge.is-pick").waitFor({ timeout: 3000 });
await page.getByRole("button", { name: /Share picks/ }).click();
await page.waitForTimeout(300);
const shared = await page.evaluate(() => window.__shared);
if (JSON.stringify(shared[0]?.names) !== JSON.stringify(["IMG_2001.jpeg"])) {
  await fail(`share sheet should get the pick, got ${JSON.stringify(shared)}`);
}
ok("Pick marks, 'Share picks' hands the original to the share sheet");

// ---- Long press to select, series via share -----------------------------------------------------
const neighbour = page.locator(".card:not(.is-current)").first();
const nb = await neighbour.boundingBox();
await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
await page.mouse.down();
await page.waitForTimeout(650);
await page.mouse.up();
await page.waitForTimeout(300);
const selected = await page.locator(".selection-count").innerText().catch(() => "");
if (!selected.startsWith("2")) await fail(`long-press should add to the selection, got "${selected}"`);
ok("press and hold selects");
await page.screenshot({ path: `${OUT}/4-selection.png` });

await page.getByRole("button", { name: "Create series" }).click();
await page.getByRole("button", { name: "Create & share…" }).click();
await page.getByText("Shared").waitFor({ timeout: 5000 });
const series = (await page.evaluate(() => window.__shared))[1];
if (!series || series.names.length !== 2 || !series.names[0].startsWith("01_")) {
  await fail(`series share should be numbered, got ${JSON.stringify(series)}`);
}
ok(`series shared as ${series.names.join(", ")}`);
await page.getByRole("button", { name: "Done" }).click();
await page.getByRole("button", { name: "Clear selection" }).click();

// ---- Discards: read-only, so a checklist ---------------------------------------------------------
await page.getByRole("button", { name: /^Discards/ }).click();
if (await page.getByRole("button", { name: /Move to trash/ }).count()) await fail("files mode cannot move files");
await page.keyboard.press("Escape");
ok("no 'move to trash' in files mode");

// ---- Layout: nothing overflows, landscape and portrait ---------------------------------------------
async function noOverflow(label) {
  const bad = await page.evaluate(() => {
    const vw = window.innerWidth;
    const issues = [];
    if (document.documentElement.scrollWidth > vw) issues.push(`page ${document.documentElement.scrollWidth}`);
    for (const el of document.querySelectorAll(".header *, .dock, .dock *, .stage-meta, .stage-count, .hints")) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1)) issues.push(`${el.className || el.tagName} ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
    const head = document.querySelector(".header");
    if (head.scrollWidth > head.clientWidth + 1) issues.push(`header ${head.scrollWidth}>${head.clientWidth}`);
    // Nothing in the header may overlap its neighbour (fits on screen ≠ fits).
    const items = [...head.querySelectorAll(".wordmark, .folder-btn, .segmented, .btn, .save-state, .divider-v")]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 2)
      .sort((a, b) => a.r.left - b.r.left);
    for (let i = 1; i < items.length; i++) {
      const [a, b] = [items[i - 1], items[i]];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.r.right > b.r.left + 1) issues.push(`header overlap: ${a.el.textContent.trim() || a.el.className} / ${b.el.textContent.trim() || b.el.className}`);
    }
    const meta = document.querySelector(".stage-meta")?.getBoundingClientRect();
    const hints = document.querySelector(".hints")?.getBoundingClientRect();
    if (meta && hints && meta.right > hints.left && meta.bottom > hints.top && meta.top < hints.bottom) issues.push("hints overlap date");
    return issues;
  });
  if (bad.length) await fail(`${label}: ${bad.slice(0, 4).join("; ")}`);
}
await noOverflow("landscape 1180");
for (const [w, h, name] of [
  [1024, 768, "landscape-1024"],
  [820, 1180, "portrait"],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(600);
  await noOverflow(name);
  await page.screenshot({ path: `${OUT}/5-${name}.png` });
}
ok("no overflow at 1180×820, 1024×768 and 820×1180");

// ---- Next session: ratings come back when the same photos are added again ----------------------------
await page.setViewportSize({ width: 1180, height: 820 });
await page.waitForTimeout(700); // autosave
await page.reload();
const welcome = await page.locator(".welcome-back").innerText().catch(() => "");
if (!welcome.includes("8 rated")) await fail(`welcome back should count 8 saved items, got "${welcome}"`);
await page.screenshot({ path: `${OUT}/6-welcome-back.png` });
await page.locator('input[type="file"][accept]').first().setInputFiles(files);
await page.locator(".card").first().waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
if (!(await page.locator(".card.r2").count())) await fail("the favorite should come back after re-adding");
if (!(await page.locator(".badge.is-pick").count())) await fail("the pick should come back after re-adding");
ok("re-adding the same photos restores ratings and picks");

await browser.close();
server.kill();
console.log(`\n✓ iPad e2e passed — screenshots in ${OUT}/`);
