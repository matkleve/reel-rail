#!/usr/bin/env node
/**
 * The gate (from grundriss). One command, so "did you run the checks?" has
 * one answer. Everything runs even after a failure, so one run tells you
 * everything that is wrong rather than the first thing.
 */
import { spawnSync } from "node:child_process";

const CHECKS = [
  ["typecheck", "npm", ["run", "--silent", "typecheck"]],
  ["lint", "npm", ["run", "--silent", "lint"]],
  ["test", "npm", ["run", "--silent", "test"]],
  ["build", "npm", ["run", "--silent", "build"]],
  // After build: drives the production build in a real browser.
  ["e2e", "node", ["scripts/e2e.mjs"]],
  ["e2e-ipad", "node", ["scripts/e2e-ipad.mjs"]],
];

const only = process.argv.slice(2);
const selected = only.length ? CHECKS.filter(([name]) => only.includes(name)) : CHECKS;
if (only.length && selected.length === 0) {
  console.error(`Unknown check(s): ${only.join(", ")}. Available: ${CHECKS.map(([n]) => n).join(", ")}`);
  process.exit(2);
}

const failed = [];
for (const [name, cmd, args] of selected) {
  process.stdout.write(`\n\x1b[1m▸ ${name}\x1b[0m\n`);
  const { status } = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (status !== 0) failed.push(name);
}

console.log("\n" + "─".repeat(56));
for (const [name] of selected) console.log(`  ${failed.includes(name) ? "\x1b[31m✗" : "\x1b[32m✓"} ${name}\x1b[0m`);

if (failed.length) {
  console.error(`\n\x1b[31m✗ verify failed: ${failed.join(", ")}\x1b[0m\n  Re-run one: node scripts/verify.mjs ${failed[0]}\n`);
  process.exit(1);
}
console.log("\n\x1b[32m✓ verify passed\x1b[0m\n");
