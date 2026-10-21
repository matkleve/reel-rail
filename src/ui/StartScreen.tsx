import { useEffect, useState } from "react";

import { loadHandle } from "@/fs/handleStore";
import { hasFileSystemAccess } from "@/fs/support";
import { openFolder, pickAndOpen } from "@/store/openFolder";
import { useUi } from "@/store/useUi";

/** Empty state, remembered-folder shortcut, scan progress and error state. */
export function StartScreen() {
  const { phase, progress, error, folderName } = useUi();
  const [remembered, setRemembered] = useState<FileSystemDirectoryHandle>();

  useEffect(() => {
    if (hasFileSystemAccess()) void loadHandle("root").then(setRemembered);
  }, []);

  if (!hasFileSystemAccess()) {
    return (
      <main className="start">
        <h1 className="brand">reel-rail</h1>
        <p className="start-lead">Open reel-rail in Chrome or Edge on a computer.</p>
        <p className="muted">
          It needs direct access to a folder on your disk (the File System Access API), which this browser does not
          offer. Nothing is uploaded — that is exactly why it needs the folder itself.
        </p>
      </main>
    );
  }

  if (phase === "scanning") {
    const listing = !progress || progress.phase === "listing";
    const pct = progress && !listing && progress.total ? (progress.done / progress.total) * 100 : 0;
    return (
      <main className="start" aria-busy="true">
        <h1 className="brand">reel-rail</h1>
        <p className="start-lead">{folderName}</p>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <p className="muted tabular">
          {listing
            ? `Looking for photos and videos… ${progress?.total ?? 0} found`
            : `${progress.done} / ${progress.total} scanned`}
        </p>
      </main>
    );
  }

  return (
    <main className="start">
      <h1 className="brand">reel-rail</h1>
      <p className="start-lead">Sort, rate and bundle your travel photos and videos on a timeline.</p>
      {remembered ? (
        <>
          <button className="btn btn-primary btn-xl" onClick={() => void openFolder(remembered)} autoFocus>
            Continue with “{remembered.name}”
          </button>
          <button className="btn btn-ghost" onClick={() => void pickAndOpen()}>
            Open another folder
          </button>
        </>
      ) : (
        <button className="btn btn-primary btn-xl" onClick={() => void pickAndOpen()} autoFocus>
          Open folder
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted small">
        Everything stays on this computer. reel-rail never changes your originals — it only writes one file,{" "}
        <code>.reel.json</code>, into the folder.
      </p>
    </main>
  );
}
