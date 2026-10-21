/** The whole app stands on the File System Access API (Chrome/Edge desktop). */
export function hasFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
