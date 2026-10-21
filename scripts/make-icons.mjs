#!/usr/bin/env node
/**
 * Renders public/icon.svg to the PNGs the manifest and iOS need. Run after
 * editing the SVG. The apple-touch-icon is opaque and square: iOS rounds the
 * corners itself and shows black where a PNG is transparent.
 */
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const svg = readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch();
const targets = [
  ["public/icon-192.png", 192, svg],
  ["public/icon-512.png", 512, svg],
  ["public/apple-touch-icon.png", 180, svg.replace(/rx="112"/, 'rx="0"')],
];
for (const [path, size, source] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}</style>${source.replace("<svg ", `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path, omitBackground: true });
  await page.close();
}
await browser.close();
console.log("icons written");
