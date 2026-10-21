import { LoaderCircle } from "lucide-react";

import { useUi } from "@/store/useUi";

import { Button } from "./kit/Button";

/**
 * Between "Add" in the system picker and the files arriving, iOS copies every
 * video out of the Photos library (and may convert it) — for big videos that
 * takes a while, and the page has no way to see the progress. This says so,
 * instead of looking frozen.
 */
export function Handover() {
  const on = useUi((s) => s.handover);
  if (!on) return null;
  return (
    <div className="handover" role="status">
      <div className="handover-card">
        <LoaderCircle className="handover-spin" size={22} aria-hidden="true" />
        <strong>Waiting for your photos…</strong>
        <p>
          Videos take longest: the phone copies each one out of the Photos library before the browser gets it. Bigger
          batches are fine — reel-rail picks up as soon as they arrive.
        </p>
        <Button variant="ghost" size="sm" onClick={() => useUi.getState().set({ handover: false })}>
          Hide
        </Button>
      </div>
    </div>
  );
}
