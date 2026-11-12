import { DE } from "./de";

/**
 * The UI language. Copy is written in English in the code and wrapped in
 * `t()`; the English text is the key into the German dictionary (src/i18n/de*.ts).
 * German on a device whose first language is German, English everywhere
 * else — so the e2e browsers (en-US) see exactly the English source text.
 * Fixed for the session: a language switch takes a reload, like any app.
 */
export type Lang = "de" | "en";

function detect(): Lang {
  try {
    const first = navigator.languages?.[0] ?? navigator.language ?? "";
    return first.toLowerCase().startsWith("de") ? "de" : "en";
  } catch {
    return "en";
  }
}

export const lang: Lang = detect();
/** For Intl formatters: dates and times read the way the copy does. */
export const locale = lang === "de" ? "de-DE" : "en-GB";

const dict: Readonly<Record<string, string>> = lang === "de" ? DE : {};

export type Vars = Record<string, string | number>;

/** Fills `{name}` placeholders; an unknown one is left as it is, so a typo shows. */
export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The text for `en` in the UI language. */
export function t(en: string, vars?: Vars): string {
  return fill(dict[en] ?? en, vars);
}

/** Singular or plural; `{n}` is the count. Both forms are keys of their own. */
export function tn(one: string, other: string, n: number, vars?: Vars): string {
  return t(n === 1 ? one : other, { n, ...vars });
}
