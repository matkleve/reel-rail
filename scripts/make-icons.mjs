#!/usr/bin/env node
/** Renders public/icon.svg to the PNG sizes the manifest needs. Run once after editing the SVG. */
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const svg = readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}</style>${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
console.log("icons written");
