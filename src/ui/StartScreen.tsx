import { ArrowDownToLine, ArrowUpDown, FolderOpen, Lock, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { loadHandle } from "@/fs/handleStore";
import type { ScanProgress } from "@/fs/scan";
import { hasFileSystemAccess } from "@/fs/support";
import { openFolder, pickAndOpen } from "@/store/openFolder";
import { useUi } from "@/store/useUi";

import { Button } from "./kit/Button";
import { Kbd } from "./kit/Kbd";
import { Logo } from "./Logo";

/** Welcome, remembered folder, scan progress, and the unsupported-browser state. */
export function StartScreen() {
  const { phase, progress, error, folderName } = useUi();
  const [remembered, setRemembered] = useState<FileSystemDirectoryHandle>();

  useEffect(() => {
    if (hasFileSystemAccess()) void loadHandle("root").then(setRemembered);
  }, []);

  if (!hasFileSystemAccess()) return <Unsupported />;
  if (phase === "scanning") return <Scanning progress={progress} folderName={folderName} />;

  return (
    <Shell>
      <h1 className="start-title">Sort a day of travel shots in minutes.</h1>
      <p className="start-lead">
        Your photos and videos on one timeline. Rate them with two keys, pick the keepers, bundle them into series.
      </p>
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
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <Steps />
      <p className="start-privacy">
        <Lock size={13} aria-hidden="true" />
        <span>
          Nothing leaves this computer. Your originals are never changed — reel-rail only writes one file,{" "}
          <code>.reel.json</code>.
        </span>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="start">
      <div className="start-brand">
        <Logo size={26} />
        reel-rail
      </div>
      <div className="start-body">{children}</div>
    </main>
  );
}

function Unsupported() {
  return (
    <Shell>
      <div className="start-icon">
        <MonitorSmartphone size={22} />
      </div>
      <h2 className="start-title-sm">Open reel-rail in Chrome or Edge on a computer</h2>
      <p className="start-lead">
        It works directly with a folder on your disk — that is how it stays private and never uploads anything. This
        browser does not allow that (yet).
      </p>
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

function Steps() {
  return (
    <ol className="start-steps">
      <li>
        <FolderOpen size={18} aria-hidden="true" />
        <strong>Open</strong>
        <span>a trip folder — sub-folders included</span>
      </li>
      <li>
        <ArrowUpDown size={18} aria-hidden="true" />
        <strong>Rate</strong>
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> five levels, from discard to favorite
        </span>
      </li>
      <li>
        <ArrowDownToLine size={18} aria-hidden="true" />
        <strong>Pick</strong>
        <span>
          <Kbd>Space</Kbd> copies the keeper to your picks folder
        </span>
      </li>
    </ol>
  );
}
