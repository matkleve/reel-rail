/**
 * Hands files to the system: the share sheet where there is one (iPad,
 * iPhone, macOS/Windows browsers) — "Save to Photos", "Save to Files",
 * AirDrop, Instagram — and plain downloads everywhere else.
 *
 * Must be called from a user gesture; nothing awaited before the share call
 * may take long, or Safari drops the gesture and refuses.
 */
export type ShareResult = "shared" | "downloaded" | "cancelled";

export function canShareFiles(files: File[] = [new File([], "x.jpg", { type: "image/jpeg" })]): boolean {
  return typeof navigator.canShare === "function" && navigator.canShare({ files });
}

export async function shareFiles(files: File[], title: string): Promise<ShareResult> {
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      throw err;
    }
  }
  download(files);
  return "downloaded";
}

function download(files: File[]): void {
  files.forEach((file, i) => {
    // Staggered: browsers drop a burst of simultaneous downloads.
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, i * 180);
  });
}

/** A copy of a file under another name (for "01_IMG_1234.jpg" in a shared series). */
export function renamed(file: File, name: string): File {
  return new File([file], name, { type: file.type, lastModified: file.lastModified });
}
