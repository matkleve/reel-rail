/** Nine tag colours (tokens --tag-0 … --tag-8). Presets keep their slot; free tags hash. */
export function tagColor(tag: string, presets: string[]): string {
  const preset = presets.indexOf(tag);
  let i = preset;
  if (i < 0) {
    let h = 0;
    for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) | 0;
    i = Math.abs(h) % 9;
  }
  return `var(--tag-${i})`;
}

/** Inline style that feeds a `.tag` chip its colour. */
export function tagStyle(tag: string, presets: string[]): React.CSSProperties {
  return { ["--tag-color" as string]: tagColor(tag, presets) };
}
