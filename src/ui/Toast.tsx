import { CircleAlert, CircleCheck } from "lucide-react";

import { useUi } from "@/store/useUi";

export function Toast() {
  const toast = useUi((s) => s.toast);
  if (!toast) return null;
  const Icon = toast.kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div key={toast.id} className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      <Icon size={16} aria-hidden="true" />
      {toast.text}
    </div>
  );
}
