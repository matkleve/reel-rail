/**
 * An in-memory folder with just enough of the File System Access API
 * (getDirectoryHandle, getFileHandle, keys, removeEntry, move, getFile) to
 * test file moves without a browser. Tests only — nothing in the app imports it.
 */
type Dir = { children: Map<string, Dir | File> };

export function memoryFolder(files: Record<string, string>, hooks: { beforeMove?: () => Promise<void> | void } = {}) {
  const root: Dir = { children: new Map() };
  const nodeOf = new WeakMap<object, Dir>();

  for (const [path, text] of Object.entries(files)) {
    const parts = path.split("/");
    const name = parts.pop()!;
    let d = root;
    for (const p of parts) {
      if (!d.children.has(p)) d.children.set(p, { children: new Map() });
      d = d.children.get(p) as Dir;
    }
    d.children.set(name, new File([text], name, { lastModified: 1 }));
  }

  const dirHandle = (node: Dir): FileSystemDirectoryHandle => {
    const h = {
      kind: "directory",
      async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
        let child = node.children.get(name);
        if (!child && opts?.create) node.children.set(name, (child = { children: new Map() }));
        if (!child || child instanceof File) throw new DOMException(name, "NotFoundError");
        return dirHandle(child);
      },
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        if (!node.children.has(name) && opts?.create) node.children.set(name, new File([], name));
        if (!(node.children.get(name) instanceof File)) throw new DOMException(name, "NotFoundError");
        return fileHandle(node, name);
      },
      async removeEntry(name: string) {
        if (!node.children.delete(name)) throw new DOMException(name, "NotFoundError");
      },
      async *keys() {
        yield* [...node.children.keys()];
      },
    };
    nodeOf.set(h, node);
    return h as unknown as FileSystemDirectoryHandle;
  };

  const fileHandle = (parent: Dir, name: string) =>
    ({
      kind: "file",
      name,
      async getFile() {
        const f = parent.children.get(name);
        if (!(f instanceof File)) throw new DOMException(name, "NotFoundError");
        return f;
      },
      async move(to: object, newName: string) {
        await hooks.beforeMove?.();
        const f = parent.children.get(name)!;
        parent.children.delete(name);
        nodeOf.get(to)!.children.set(newName, f);
      },
    }) as unknown as FileSystemFileHandle;

  const paths = () => {
    const out: string[] = [];
    const walk = (d: Dir, pre: string) => {
      for (const [k, v] of d.children) {
        if (v instanceof File) out.push(pre + k);
        else walk(v, `${pre}${k}/`);
      }
    };
    walk(root, "");
    return out.sort();
  };

  return { root: dirHandle(root), paths };
}
