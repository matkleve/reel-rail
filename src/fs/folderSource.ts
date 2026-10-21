import type { ReelFile } from "@/types";

import { loadReel, saveReel } from "./reelFile";
import type { Source, SourceFile } from "./source";
import { fileAt, walk } from "./walk";

/** A real folder on disk (File System Access API). */
export class FolderSource implements Source {
  readonly kind = "folder";
  constructor(readonly dir: FileSystemDirectoryHandle) {}

  get name(): string {
    return this.dir.name;
  }

  async list(onFound?: (count: number) => void): Promise<SourceFile[]> {
    const found = await walk(this.dir, onFound);
    return found.map((f) => ({ path: f.path, type: f.type, file: () => f.handle.getFile() }));
  }

  async getFile(path: string): Promise<File> {
    return (await fileAt(this.dir, path)).getFile();
  }

  loadReel(): Promise<ReelFile> {
    return loadReel(this.dir);
  }

  saveReel(reel: ReelFile): Promise<void> {
    return saveReel(this.dir, reel);
  }
}
