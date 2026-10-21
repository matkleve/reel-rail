import { useUi } from "@/store/useUi";

import { Dialog } from "./Dialog";
import { SHORTCUTS } from "./shortcuts";

export function HelpDialog() {
  const open = useUi((s) => s.dialog === "help");
  const close = () => useUi.getState().set({ dialog: null });
  return (
    <Dialog open={open} onClose={close} title="Keyboard shortcuts">
      <table className="shortcuts">
        <tbody>
          {SHORTCUTS.map(([key, what]) => (
            <tr key={key}>
              <td>
                <kbd>{key}</kbd>
              </td>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
