import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { loadHandle } from "@/fs/handleStore";
import type { ScanProgress } from "@/fs/scan";
import { sourceMode } from "@/fs/support";
import { openFolder, pickAndOpen } from "@/store/openSource";
import { useUi } from "@/store/useUi";

import { FilesStart } from "./FilesStart";
import { Button } from "./kit/Button";
import { Hero, Privacy, Shell, StartError, Steps } from "./StartParts";

/** Welcome (folder or files mode), and scan progress. */
export function StartScreen() {
  const { phase, progress, folderName } = useUi();
  if (phase === "scanning") return <Scanning progress={progress} folderName={folderName} />;
  return sourceMode() === "folder" ? <FolderStart /> : <FilesStart />;
}

function FolderStart() {
  const error = useUi((s) => s.error);
  const [remembered, setRemembered] = useState<FileSystemDirectoryHandle>();

  useEffect(() => {
    void loadHandle("root").then(setRemembered);
  }, []);

  return (
    <Shell>
      <Hero />
      <div className="start-actions">
        {remembered ? (
          <>
            <Button variant="primary" size="lg" icon={FolderOpen} onClick={() => void openFolder(remembered)} autoFocus>
              Continue with “{remembered.name}”
            </Button>
            <Button variant="ghost" size="lg" onClick={() => void pickAndOpen()}>
              Open another folder
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" icon={FolderOpen} onClick={() => void pickAndOpen()} autoFocus>
            Open a folder
          </Button>
        )}
      </div>
      <StartError error={error} />
      <Steps />
      <Privacy>
        Nothing leaves this computer. Your originals are never changed — reel-rail only writes one file,{" "}
        <code>.reel.json</code>.
      </Privacy>
    </Shell>
  );
}

function Scanning({ progress, folderName }: { progress?: ScanProgress; folderName?: string }) {
  const listing = !progress || progress.phase === "listing";
  const pct = progress && !listing && progress.total ? (progress.done / progress.total) * 100 : 0;
  return (
    <Shell>
      <div className="scan-card" aria-busy="true">
        <div className="scan-head">
          <FolderOpen size={16} aria-hidden="true" />
          <strong>{folderName}</strong>
          <span className="tabular text-3">{listing ? "" : `${Math.round(pct)} %`}</span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={listing ? "progress-bar is-indeterminate" : "progress-bar"} style={{ width: listing ? undefined : `${pct}%` }} />
        </div>
        <p className="text-2 tabular">
          {listing
            ? `Looking for photos and videos… ${progress?.total ?? 0} found`
            : `Reading ${progress.done} of ${progress.total}`}
        </p>
      </div>
    </Shell>
  );
}

