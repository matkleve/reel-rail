import { useUi } from "@/store/useUi";

import { Dialog } from "./kit/Dialog";
import { Kbd } from "./kit/Kbd";
import { SHORTCUT_GROUPS } from "./shortcuts";

export function HelpDialog() {
  const open = useUi((s) => s.dialog === "help");
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title="Keyboard shortcuts" subtitle="Everything also works with the mouse — hover a button to see its key." wide>
      <div className="shortcut-groups">
        {SHORTCUT_GROUPS.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <dl>
              {g.items.map(([keys, what]) => (
                <div key={what} className="shortcut-row">
                  <dt>
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
