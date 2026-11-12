#!/usr/bin/env node
/**
 * Renders public/icon.svg to the PNGs the manifest and iOS need. Run after
 * editing the SVG. The apple-touch-icon and the native app icon are opaque
 * and square: iOS rounds the corners itself and shows black where a PNG is
 * transparent. The native splash is the mark centred on the cream page
 * colour (LaunchScreen fills the screen with it, cropping the edges).
 */
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const svg = readFileSync("public/icon.svg", "utf8");
const square = svg.replace(/rx="112"/, 'rx="0"');
// The page colour of the light theme (tokens.css --bg); the mark at 1/5 of the side.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#f5ede3"/><g transform="translate(1093 1093) scale(1.0664)">${svg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, "")}</g></svg>`;
const browser = await chromium.launch();
const targets = [
  ["public/icon-192.png", 192, svg],
  ["public/icon-512.png", 512, svg],
  ["public/apple-touch-icon.png", 180, square],
  ["ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", 1024, square],
  ...["", "-1", "-2"].map((n) => [`ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732${n}.png`, 2732, splash]),
];
for (const [path, size, source] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>*{margin:0}</style>${source.replace("<svg ", `<svg width="${size}" height="${size}" `)}`);
  // Opaque where iOS needs it (no alpha channel); the web icons keep their rounded transparent corners.
  await page.screenshot({ path, omitBackground: !path.startsWith("ios/") && !path.includes("apple-touch") });
  await page.close();
}
await browser.close();
console.log("icons written");
