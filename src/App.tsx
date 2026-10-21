import { useLayoutEffect } from "react";

import { Carousel } from "@/carousel/Carousel";
import { CleanupDialog } from "@/cleanup/CleanupDialog";
import { CreateSeriesDialog } from "@/series/CreateSeriesDialog";
import { SeriesListDialog } from "@/series/SeriesListDialog";
import { useUi } from "@/store/useUi";
import { Waveform } from "@/timeline/Waveform";
import { Dock } from "@/ui/Dock";
import { Header } from "@/ui/Header";
import { HelpDialog } from "@/ui/HelpDialog";
import { SettingsDialog } from "@/ui/SettingsDialog";
import { StageOverlay } from "@/ui/StageOverlay";
import { StartScreen } from "@/ui/StartScreen";
import { Toast } from "@/ui/Toast";
import { useKeyboard } from "@/ui/useKeyboard";

export function App() {
  const phase = useUi((s) => s.phase);
  const theme = useUi((s) => s.theme);
  useKeyboard();

  // Layout effect: it must land before children's effects run — the waveform
  // canvas reads the theme's colour tokens in its own effect.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (phase !== "ready") return <StartScreen />;

  return (
    <div className="app">
      <Header />
      <main className="stage-wrap">
        <Carousel />
        <StageOverlay />
        <Dock />
      </main>
      <Waveform />
      <Toast />
      <CreateSeriesDialog />
      <SeriesListDialog />
      <SettingsDialog />
      <CleanupDialog />
      <HelpDialog />
    </div>
  );
}
