import { useState } from "react";

import { t } from "@/i18n";
import { setTagPresets } from "@/store/actions";
import { useReel } from "@/store/useReel";
import { useUi } from "@/store/useUi";
import { DEFAULT_TAG_PRESETS } from "@/types";

import { Button } from "./kit/Button";
import { Dialog } from "./kit/Dialog";
import { Kbd } from "./kit/Kbd";
import { tagStyle } from "./tagColor";

/** Tag presets for keys 1–9. Stored in `.reel.json`, so they travel with the folder. */
export function SettingsDialog() {
  const open = useUi((s) => s.dialog === "settings");
  return open ? <PresetDialog onDone={() => useUi.getState().set({ dialog: null })} /> : null;
}

function PresetDialog({ onDone }: { onDone(): void }) {
  const [presets, setPresets] = useState(() => {
    const p = useReel.getState().reel.tagPresets;
    return Array.from({ length: 9 }, (_, i) => p[i] ?? "");
  });

  return (
    <Dialog
      open
      onClose={onDone}
      title={t("Tag presets")}
      subtitle={t("Keys 1–9 add or remove these tags on the current item or the selection.")}
      footer={
        <>
          <Button variant="ghost" onClick={() => setPresets([...DEFAULT_TAG_PRESETS])}>
            {t("Reset to defaults")}
          </Button>
          <span className="spacer" />
          <Button variant="ghost" onClick={onDone}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" type="submit" form="preset-form">
            {t("Save")}
          </Button>
        </>
      }
    >
      <form
        id="preset-form"
        className="preset-grid"
        onSubmit={(e) => {
          e.preventDefault();
          setTagPresets(presets);
          onDone();
        }}
      >
        {presets.map((p, i) => (
          <label key={i} className="preset-row">
            <Kbd>{String(i + 1)}</Kbd>
            <span className="tag-dot" style={tagStyle(p, presets)} />
            <input
              className="input"
              value={p}
              aria-label={t("Preset {n}", { n: i + 1 })}
              onChange={(e) => setPresets(presets.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
      </form>
    </Dialog>
  );
}
