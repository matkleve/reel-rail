import { useState } from "react";

import { setTagPresets } from "@/store/actions";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { DEFAULT_TAG_PRESETS } from "@/types";

import { Dialog } from "./Dialog";

/** Tag presets for keys 1–9. Stored in `.reel.json`, so they travel with the folder. */
export function SettingsDialog() {
  const open = useUi((s) => s.dialog === "settings");
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title="Tag presets">
      {open && <PresetForm onDone={close} />}
    </Dialog>
  );
}

function PresetForm({ onDone }: { onDone(): void }) {
  const [presets, setPresets] = useState(() => {
    const p = useReel.getState().reel.tagPresets;
    return Array.from({ length: 9 }, (_, i) => p[i] ?? "");
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTagPresets(presets);
        onDone();
      }}
    >
      <p className="muted small">Keys 1–9 add or remove these tags on the current item or selection.</p>
      <div className="preset-grid">
        {presets.map((p, i) => (
          <label key={i} className="preset-row">
            <kbd>{i + 1}</kbd>
            <input
              className="input"
              value={p}
              onChange={(e) => setPresets(presets.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
      </div>
      <div className="dialog-footer">
        <button type="button" className="btn btn-ghost" onClick={() => setPresets([...DEFAULT_TAG_PRESETS])}>
          Reset to defaults
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
