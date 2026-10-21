/**
 * Free names in a folder, decided from a listing of the folder.
 *
 * Not by probing `getFileHandle(name)` / `getDirectoryHandle(name)` and
 * catching NotFound: Chromium answers such a probe *successfully* for some
 * names that do not exist (seen with an en dash, "Trip – sorted"), and a
 * "find a free name" loop built on it never ends. See docs/TRAPS.md.
 */
export async function namesIn(dir: FileSystemDirectoryHandle): Promise<Set<string>> {
  const names = new Set<string>();
  for await (const name of dir.keys()) names.add(name);
  return names;
}

/** `name`, else `stem (2).ext`, `stem (3).ext` … — the first not in `taken`. */
export function freeName(name: string, taken: (candidate: string) => boolean, folder = false): string {
  const dot = folder ? -1 : name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? name : `${stem} (${n})${ext}`;
    if (!taken(candidate)) return candidate;
  }
}
