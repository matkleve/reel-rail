import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { startAccount } from "./account/account";
import { App } from "./App";
import "@fontsource-variable/inter";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/carousel.css";
import "./styles/waveform.css";
import "./styles/screens.css";
import "./styles/responsive.css";

startAccount();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline + installable. Skipped in dev so Vite's HMR is never served stale.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
