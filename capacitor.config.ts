import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native iPhone/iPad app: the same web app (dist/) in a native shell, plus
 * a small Photos plugin for what a browser cannot do — read the library
 * without copying every video first, and delete into "Recently Deleted".
 * See docs/NATIVE.md.
 */
const config: CapacitorConfig = {
  appId: "app.reelrail",
  appName: "reel-rail",
  webDir: "dist",
  ios: {
    contentInset: "never",
  },
};

export default config;
