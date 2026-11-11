import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/kit/Button";

const KEY = "reel-rail:deck-hint-dismissed";

/** First run on the phone: what each direction means. Dismissed for good with ×. */
export function DeckHint() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Private mode: hidden for this session only.
    }
  };
  return (
    <div className="hints deck-hint" role="note">
      <span>→ good</span>
      <span>← bad</span>
      <span>↑ top</span>
      <span>↓ delete</span>
      <Button icon={X} label="Hide hints" size="sm" onClick={dismiss} />
    </div>
  );
}
