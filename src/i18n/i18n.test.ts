import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DE } from "./de";
import { DE_DIALOGS } from "./deDialogs";
import { DE_MESSAGES } from "./deMessages";
import { DE_UI } from "./deUi";
import { fill, t, tn } from "./index";

// Tests run from the repository root (vitest, npm run verify).
const SRC = join(process.cwd(), "src");
const STR = String.raw`"((?:[^"\\]|\\.)*)"`;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "i18n" || name === "__fixtures__" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Every key the code asks for: the literal first argument of t(), both literals of tn(). */
function usedKeys(): { keys: Set<string>; dynamic: string[] } {
  const keys = new Set<string>();
  const dynamic: string[] = [];
  for (const file of sources(SRC)) {
    const code = readFileSync(file, "utf8");
    for (const m of code.matchAll(new RegExp(String.raw`\bt\(\s*${STR}`, "g"))) keys.add(JSON.parse(`"${m[1]}"`));
    for (const m of code.matchAll(new RegExp(String.raw`\btn\(\s*${STR},\s*${STR}`, "g"))) {
      keys.add(JSON.parse(`"${m[1]}"`));
      keys.add(JSON.parse(`"${m[2]}"`));
    }
    // A key that is not a literal cannot be checked here — and would go untranslated unnoticed.
    for (const m of code.matchAll(/\bt\(\s*([^"\s)])/g)) dynamic.push(`${file}: t(${m[1]}…`);
    for (const m of code.matchAll(/\btn\(\s*([^"\s)])/g)) dynamic.push(`${file}: tn(${m[1]}…`);
  }
  return { keys, dynamic };
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("German dictionary", () => {
  const { keys, dynamic } = usedKeys();

  it("is asked only for literal keys", () => {
    expect(dynamic).toEqual([]);
  });

  it("has every key the code uses", () => {
    expect([...keys].filter((k) => !(k in DE))).toEqual([]);
  });

  it("has no keys the code no longer uses", () => {
    expect(Object.keys(DE).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("has each key in one file only (a later file would silently win)", () => {
    const parts = [DE_UI, DE_DIALOGS, DE_MESSAGES].map((d) => Object.keys(d));
    expect(parts.flat().length).toBe(Object.keys(DE).length);
  });

  it("keeps the placeholders of each key", () => {
    const off = Object.entries(DE).filter(([en, de]) => placeholders(en).join() !== placeholders(de).join());
    expect(off).toEqual([]);
  });
});

describe("t", () => {
  it("is English in the test browser (en-US), placeholders filled", () => {
    expect(t("Leaves in {n} s", { n: 5 })).toBe("Leaves in 5 s");
    expect(tn("1 item", "{n} items", 1)).toBe("1 item");
    expect(tn("1 item", "{n} items", 3)).toBe("3 items");
  });

  it("leaves an unknown placeholder visible", () => {
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});
