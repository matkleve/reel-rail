import { ArrowDownToLine, ArrowUpDown, FolderOpen, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { isTouch, sourceMode } from "@/fs/support";

import { Kbd } from "./kit/Kbd";
import { Logo } from "./Logo";

/** Building blocks shared by the folder-mode and files-mode start screens. */

export function Hero() {
  return (
    <>
      <h1 className="start-title">Sort a day of travel shots in minutes.</h1>
      <p className="start-lead">
        Your photos and videos on one timeline. Rate them in a flick, pick the keepers, bundle them into series.
      </p>
    </>
  );
}

export function StartError({ error }: { error?: string }) {
  return error ? (
    <p className="error-text" role="alert">
      {error}
    </p>
  ) : null;
}

export function Privacy({ children }: { children: ReactNode }) {
  return (
    <p className="start-privacy">
      <Lock size={13} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Shell({ children }: { children: ReactNode }) {
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

/** The three steps — in keys on a computer, in gestures on a tablet. */
export function Steps() {
  const touch = isTouch();
  const files = sourceMode() === "files";
  return (
    <ol className="start-steps">
      <li>
        <FolderOpen size={18} aria-hidden="true" />
        <strong>{files ? "Add" : "Open"}</strong>
        <span>{files ? "photos and videos from Photos or Files" : "a trip folder — sub-folders included"}</span>
      </li>
      <li>
        <ArrowUpDown size={18} aria-hidden="true" />
        <strong>Rate</strong>
        <span>
          {touch ? (
            "Swipe up or down — five levels, from discard to favorite"
          ) : (
            <>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> five levels, from discard to favorite
            </>
          )}
        </span>
      </li>
      <li>
        <ArrowDownToLine size={18} aria-hidden="true" />
        <strong>Pick</strong>
        <span>
          {files ? (
            "Tap Pick on the keepers, then share them all at once"
          ) : (
            <>
              <Kbd>Space</Kbd> copies the keeper to your picks folder
            </>
          )}
        </span>
      </li>
    </ol>
  );
}
