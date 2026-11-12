import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { accountsEnabled, startAccount } from "./account/account";
import { startSync } from "./account/syncRunner";
import { App } from "./App";
import { lang } from "./i18n";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fraunces";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/carousel.css";
import "./styles/deck.css";
import "./styles/timeline.css";
import "./styles/screens.css";
import "./styles/responsive.css";

startAccount();
if (accountsEnabled) startSync();

// Hyphenation, the screen reader's voice and the date pickers follow the UI language.
document.documentElement.lang = lang;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline + installable. Skipped in dev so Vite's HMR is never served stale.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
