/** The whole folder mode stands on the File System Access API (Chrome/Edge desktop). */
export function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Folder mode where the browser can do it; files mode everywhere else
 * (iPad, iPhone, Safari, Firefox, Brave). `?mode=files` forces files mode —
 * for trying it out on a desktop, and for the iPad e2e test.
 */
export function sourceMode(): "folder" | "files" {
  const forced = new URLSearchParams(window.location.search).get("mode") === "files";
  return hasFileSystemAccess() && !forced ? "folder" : "files";
}

/** Finger instead of mouse: bigger targets, swipe hints, no hover tooltips. */
export function isTouch(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Desktop Safari/Firefox/Brave can hand over a whole folder (read-only); iOS cannot. */
export function canPickFolder(): boolean {
  return !isTouch() && "webkitdirectory" in HTMLInputElement.prototype;
}
